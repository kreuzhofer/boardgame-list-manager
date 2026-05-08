import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  AccountResponse,
  AdminAccountRow,
  CreateAccountInput,
  AccountErrorCodes,
  AccountErrorMessages,
} from '../types/account';
import { sendTemplatedEmail, type SendTemplatedEmailArgs } from './email.service';
import { createLoginToken, consumeLoginToken } from './loginToken.service';
import { config } from '../config';

const EMAIL_CHANGE_TTL_MINUTES = 60;
const EMAIL_CHANGE_MAX_REQUESTS_PER_HOUR = 3;

const BCRYPT_COST_FACTOR = 12;

/**
 * Fire-and-forget transactional email. Notification mails (password
 * changed, account deactivated) must never block or fail the underlying
 * mutation — if SMTP is down the user still expects their password
 * change to land. We log the error and move on.
 */
function notify(args: SendTemplatedEmailArgs, context: string): void {
  sendTemplatedEmail(args).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[notify] ${context} email failed to=${args.to}: ${msg}`);
  });
}

export class AccountError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AccountError';
  }
}

export class AccountService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate password meets requirements:
   * - Min 8 characters
   * - At least one letter
   * - At least one number
   */
  validatePassword(password: string): void {
    if (password.length < 8) {
      throw new AccountError(
        AccountErrorCodes.PASSWORD_TOO_SHORT,
        AccountErrorMessages.PASSWORD_TOO_SHORT
      );
    }

    if (!/[a-zA-Z]/.test(password)) {
      throw new AccountError(
        AccountErrorCodes.PASSWORD_MISSING_LETTER,
        AccountErrorMessages.PASSWORD_MISSING_LETTER
      );
    }

    if (!/[0-9]/.test(password)) {
      throw new AccountError(
        AccountErrorCodes.PASSWORD_MISSING_NUMBER,
        AccountErrorMessages.PASSWORD_MISSING_NUMBER
      );
    }
  }

  /**
   * Check if password is valid without throwing
   */
  isPasswordValid(password: string): boolean {
    try {
      this.validatePassword(password);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST_FACTOR);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AccountError(
        AccountErrorCodes.INVALID_EMAIL,
        AccountErrorMessages.INVALID_EMAIL
      );
    }
  }

  /**
   * Convert Prisma account to AccountResponse
   */
  private toAccountResponse(account: {
    id: string;
    email: string;
    role: string;
    status: string;
    displayName?: string | null;
    createdAt: Date;
  }): AccountResponse {
    return {
      id: account.id,
      email: account.email,
      role: account.role as 'account_owner' | 'admin',
      status: account.status as 'active' | 'deactivated' | 'unverified',
      displayName: account.displayName ?? null,
      createdAt: account.createdAt,
    };
  }

  /**
   * Register a new account
   */
  async register(input: CreateAccountInput): Promise<AccountResponse> {
    this.validateEmail(input.email);
    this.validatePassword(input.password);

    // Check if email already exists
    const existing = await this.prisma.account.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new AccountError(
        AccountErrorCodes.EMAIL_EXISTS,
        AccountErrorMessages.EMAIL_EXISTS,
        409
      );
    }

    const passwordHash = await this.hashPassword(input.password);

    const account = await this.prisma.account.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        // New signups land as `player` by default. Creating their first
        // event promotes them to `account_owner` (handled in
        // eventService.createEvent). Admins are seeded out-of-band only.
        role: 'player',
        status: 'active',
      },
    });

    return this.toAccountResponse(account);
  }

  /**
   * Authenticate account with email and password
   */
  async authenticate(email: string, password: string): Promise<AccountResponse> {
    const account = await this.prisma.account.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!account) {
      throw new AccountError(
        AccountErrorCodes.INVALID_CREDENTIALS,
        AccountErrorMessages.INVALID_CREDENTIALS,
        401
      );
    }

    const isValid = await this.verifyPassword(password, account.passwordHash);
    if (!isValid) {
      throw new AccountError(
        AccountErrorCodes.INVALID_CREDENTIALS,
        AccountErrorMessages.INVALID_CREDENTIALS,
        401
      );
    }

    if (account.status === 'deactivated') {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_DEACTIVATED,
        AccountErrorMessages.ACCOUNT_DEACTIVATED,
        403
      );
    }

    return this.toAccountResponse(account);
  }

  /**
   * Update the account's default per-event display name. Empty / blank
   * input clears the field (falls back to email local-part at use-site).
   *
   * Existing per-event User rows keep their name — this is the default
   * for *new* events the account joins, not a cascade.
   */
  async updateDisplayName(
    accountId: string,
    rawDisplayName: string | null | undefined,
  ): Promise<AccountResponse> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404,
      );
    }

    let next: string | null = null;
    if (typeof rawDisplayName === 'string') {
      const trimmed = rawDisplayName.trim();
      if (trimmed.length > 60) {
        throw new AccountError(
          'DISPLAY_NAME_TOO_LONG',
          'Der Anzeigename darf höchstens 60 Zeichen lang sein.',
          400,
        );
      }
      next = trimmed.length === 0 ? null : trimmed;
    }

    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: { displayName: next },
    });

    return this.toAccountResponse(updated);
  }

  /**
   * Get account by ID
   */
  async getById(id: string): Promise<AccountResponse | null> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      return null;
    }

    return this.toAccountResponse(account);
  }

  /**
   * List all accounts (admin only).
   *
   * Includes `ownedEventsCount` per row so the admin table can decide
   * locally whether to enable the "Löschen" button or surface "Treffs
   * übertragen" — saves an N+1 round-trip from the frontend.
   */
  async getAll(): Promise<AdminAccountRow[]> {
    const accounts = await this.prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { events: true } } },
    });
    return accounts.map((account) => ({
      ...this.toAccountResponse(account),
      ownedEventsCount: account._count.events,
    }));
  }

  /**
   * Change password (validates current password first)
   */
  async changePassword(
    accountId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404
      );
    }

    const isValid = await this.verifyPassword(currentPassword, account.passwordHash);
    if (!isValid) {
      throw new AccountError(
        AccountErrorCodes.WRONG_PASSWORD,
        AccountErrorMessages.WRONG_PASSWORD,
        401
      );
    }

    this.validatePassword(newPassword);

    const newPasswordHash = await this.hashPassword(newPassword);

    await this.prisma.account.update({
      where: { id: accountId },
      data: { passwordHash: newPasswordHash },
    });

    notify(
      {
        to: account.email,
        template: 'password-changed',
        locale: account.locale,
        variables: {},
      },
      'password-changed',
    );
  }

  /**
   * Deactivate account (requires password confirmation)
   */
  async deactivate(accountId: string, password: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404
      );
    }

    // Prevent admin self-deactivation
    if (account.role === 'admin') {
      throw new AccountError(
        AccountErrorCodes.SELF_DEACTIVATION,
        AccountErrorMessages.SELF_DEACTIVATION,
        403
      );
    }

    const isValid = await this.verifyPassword(password, account.passwordHash);
    if (!isValid) {
      throw new AccountError(
        AccountErrorCodes.WRONG_PASSWORD,
        AccountErrorMessages.WRONG_PASSWORD,
        401
      );
    }

    await this.prisma.account.update({
      where: { id: accountId },
      data: { status: 'deactivated' },
    });

    notify(
      {
        to: account.email,
        template: 'account-deactivated',
        locale: account.locale,
        variables: {},
      },
      'account-deactivated',
    );
  }

  /**
   * Promote account to admin (admin only)
   */
  async promoteToAdmin(accountId: string, promoterId: string): Promise<AccountResponse> {
    // Check if promoter is admin
    const promoter = await this.prisma.account.findUnique({
      where: { id: promoterId },
    });

    if (!promoter || promoter.role !== 'admin') {
      throw new AccountError(
        AccountErrorCodes.NOT_AUTHORIZED,
        AccountErrorMessages.NOT_AUTHORIZED,
        403
      );
    }

    // Check if target account exists
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404
      );
    }

    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: { role: 'admin' },
    });

    return this.toAccountResponse(updated);
  }

  /**
   * Set account role (admin only)
   */
  async setRole(accountId: string, role: 'account_owner' | 'admin', callerAccountId: string): Promise<AccountResponse> {
    if (accountId === callerAccountId) {
      throw new AccountError(
        AccountErrorCodes.SELF_ROLE_CHANGE,
        AccountErrorMessages.SELF_ROLE_CHANGE,
        403
      );
    }

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404
      );
    }

    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: { role },
    });

    return this.toAccountResponse(updated);
  }

  /**
   * Set account status (admin only)
   */
  async setStatus(accountId: string, status: 'active' | 'deactivated', actorId?: string): Promise<AccountResponse> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404
      );
    }

    // Prevent admin self-deactivation
    if (status === 'deactivated' && actorId === accountId && account.role === 'admin') {
      throw new AccountError(
        AccountErrorCodes.SELF_DEACTIVATION,
        AccountErrorMessages.SELF_DEACTIVATION,
        403
      );
    }

    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: { status },
    });

    // Notify the account holder when an admin deactivates them. The
    // self-deactivation path (`deactivate()` above) sends its own
    // notification — both call-sites converge on the same template.
    if (status === 'deactivated' && account.status !== 'deactivated') {
      notify(
        {
          to: account.email,
          template: 'account-deactivated',
          locale: account.locale,
          variables: {},
        },
        'account-deactivated',
      );
    }

    return this.toAccountResponse(updated);
  }

  /**
   * Reset account password (admin only)
   */
  async resetPassword(accountId: string, newPassword: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404
      );
    }

    this.validatePassword(newPassword);

    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.account.update({
      where: { id: accountId },
      data: { passwordHash },
    });

    notify(
      {
        to: account.email,
        template: 'password-changed',
        locale: account.locale,
        variables: {},
      },
      'password-changed',
    );
  }

  /**
   * Request a change of the account's email address.
   *
   * Two-step verification:
   * 1. Validate the new address (format + uniqueness).
   * 2. Create a single-use token bound to (accountId, newEmail).
   * 3. Send a confirm link to the NEW address.
   * 4. Send a notice to the OLD address so the legitimate owner can react
   *    if their session was compromised.
   *
   * The actual email swap happens in `confirmEmailChange()` once the user
   * clicks the link — proving they control the new address.
   */
  async requestEmailChange(accountId: string, newEmailRaw: string): Promise<void> {
    const newEmail = newEmailRaw.trim().toLowerCase();
    this.validateEmail(newEmail);

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404,
      );
    }
    if (account.status === 'deactivated') {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_DEACTIVATED,
        AccountErrorMessages.ACCOUNT_DEACTIVATED,
        403,
      );
    }
    if (newEmail === account.email) {
      throw new AccountError(
        'EMAIL_UNCHANGED',
        'Diese E-Mail-Adresse ist bereits hinterlegt.',
        400,
      );
    }

    const taken = await this.prisma.account.findUnique({ where: { email: newEmail } });
    if (taken) {
      throw new AccountError(
        AccountErrorCodes.EMAIL_EXISTS,
        AccountErrorMessages.EMAIL_EXISTS,
        409,
      );
    }

    // Soft rate limit — same envelope as the magic-link flow.
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.prisma.loginToken.count({
      where: {
        accountId,
        purpose: 'email-change',
        createdAt: { gte: since },
      },
    });
    if (recent >= EMAIL_CHANGE_MAX_REQUESTS_PER_HOUR) {
      throw new AccountError(
        'EMAIL_CHANGE_RATE_LIMITED',
        'Zu viele Anfragen. Bitte in einer Stunde erneut versuchen.',
        429,
      );
    }

    const { token } = await createLoginToken({
      accountId,
      purpose: 'email-change',
      newEmail,
      ttlMinutes: EMAIL_CHANGE_TTL_MINUTES,
    });
    const link = `${config.app.publicUrl}/auth/email-change/confirm?token=${encodeURIComponent(token)}`;

    notify(
      {
        to: newEmail,
        template: 'email-change-confirm',
        locale: account.locale,
        variables: { link, newEmail, expiresInMinutes: EMAIL_CHANGE_TTL_MINUTES },
      },
      'email-change-confirm',
    );
    notify(
      {
        to: account.email,
        template: 'email-change-notice',
        locale: account.locale,
        variables: { newEmail },
      },
      'email-change-notice',
    );
  }

  /**
   * Consume an email-change token.
   *
   * Validates the token, ensures the new email is still available
   * (someone else might have grabbed it between request and click),
   * swaps `account.email`, and notifies the new address that the swap
   * has completed.
   */
  async confirmEmailChange(
    rawToken: string,
    ip: string | null,
  ): Promise<AccountResponse> {
    const result = await consumeLoginToken({ token: rawToken, ip });
    if (!result.ok) {
      const messages: Record<string, string> = {
        not_found: 'Ungültiger Bestätigungs-Link.',
        expired: 'Der Bestätigungs-Link ist abgelaufen. Bitte die Änderung erneut anfordern.',
        already_consumed: 'Dieser Bestätigungs-Link wurde bereits verwendet.',
      };
      throw new AccountError(
        result.reason.toUpperCase(),
        messages[result.reason] ?? 'Ungültiger Bestätigungs-Link.',
        400,
      );
    }
    if (result.purpose !== 'email-change' || !result.newEmail) {
      throw new AccountError('INVALID_TOKEN', 'Ungültiger Bestätigungs-Link.', 400);
    }

    const newEmail = result.newEmail;

    const account = await this.prisma.account.findUnique({
      where: { id: result.accountId },
    });
    if (!account || account.status === 'deactivated') {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404,
      );
    }

    // Race: another account may have claimed the address between the
    // request and the click. Fail clearly so the user can retry with a
    // different address.
    const taken = await this.prisma.account.findUnique({ where: { email: newEmail } });
    if (taken && taken.id !== account.id) {
      throw new AccountError(
        AccountErrorCodes.EMAIL_EXISTS,
        AccountErrorMessages.EMAIL_EXISTS,
        409,
      );
    }

    const updated = await this.prisma.account.update({
      where: { id: account.id },
      data: { email: newEmail },
    });

    // No post-completion email: the OLD address was already notified at
    // request time (`email-change-notice`), and the user who just clicked
    // the link sees the success page in their browser — another email
    // would be redundant.

    return this.toAccountResponse(updated);
  }

  // ─── Admin: delete + transfer events ───────────────────────────────

  /**
   * List events owned by the given account. Backs the delete pre-check
   * (operator must transfer ownership before deleting) and the transfer
   * picker (so the operator sees what they're about to move).
   */
  async getOwnedEvents(accountId: string): Promise<
    Array<{ id: string; name: string; slug: string | null; status: string }>
  > {
    const events = await this.prisma.event.findMany({
      where: { ownerAccountId: accountId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, slug: true, status: true },
    });
    return events;
  }

  /**
   * Hard-delete an account.
   *
   * Side effects via existing schema cascades:
   *  - Sessions, LoginTokens          → cascade delete
   *  - per-event User rows            → accountId set to NULL (player
   *                                     identity preserved per-event,
   *                                     just disassociated)
   *  - EventParticipation rows        → accountId set to NULL
   *
   * Refuses to delete:
   *  - the caller themselves (SELF_DELETE)
   *  - an account that still owns events (ACCOUNT_HAS_EVENTS) — operator
   *    must transfer ownership first via `transferEvents`
   *
   * The Event.ownerAccountId relation is configured `onDelete: Cascade`
   * as a safety net, but the precheck here means we never rely on it.
   */
  async deleteAccount(targetAccountId: string, callerAccountId: string): Promise<void> {
    if (targetAccountId === callerAccountId) {
      throw new AccountError(
        AccountErrorCodes.SELF_DELETE,
        AccountErrorMessages.SELF_DELETE,
        403,
      );
    }

    const account = await this.prisma.account.findUnique({
      where: { id: targetAccountId },
    });
    if (!account) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404,
      );
    }

    const ownedCount = await this.prisma.event.count({
      where: { ownerAccountId: targetAccountId },
    });
    if (ownedCount > 0) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_HAS_EVENTS,
        AccountErrorMessages.ACCOUNT_HAS_EVENTS,
        409,
      );
    }

    await this.prisma.account.delete({ where: { id: targetAccountId } });
  }

  /**
   * Transfer all events owned by `sourceAccountId` to `targetAccountId`.
   *
   * Runs as a single transaction so the bulk reassignment and the
   * target-role promotion either both land or both don't. Auto-promotes
   * a `player` target to `account_owner` to mirror what `event.service
   * .createEvent()` already does for first-time event creators (line
   * 233-240 in event.service.ts).
   *
   * Validation:
   *  - target ≠ source                  (SAME_TRANSFER_TARGET)
   *  - target exists and is `active`    (INVALID_TRANSFER_TARGET)
   *
   * Source can be the caller — an admin consolidating their own events
   * before deleting their account is a legitimate flow. Source = self
   * is NOT blocked here; `deleteAccount` will block the final delete
   * step independently.
   */
  async transferEvents(
    sourceAccountId: string,
    targetAccountId: string,
    _callerAccountId: string,
  ): Promise<{ transferred: number }> {
    if (sourceAccountId === targetAccountId) {
      throw new AccountError(
        AccountErrorCodes.SAME_TRANSFER_TARGET,
        AccountErrorMessages.SAME_TRANSFER_TARGET,
        400,
      );
    }

    const [source, target] = await Promise.all([
      this.prisma.account.findUnique({ where: { id: sourceAccountId } }),
      this.prisma.account.findUnique({ where: { id: targetAccountId } }),
    ]);

    if (!source) {
      throw new AccountError(
        AccountErrorCodes.ACCOUNT_NOT_FOUND,
        AccountErrorMessages.ACCOUNT_NOT_FOUND,
        404,
      );
    }
    if (!target || target.status !== 'active') {
      throw new AccountError(
        AccountErrorCodes.INVALID_TRANSFER_TARGET,
        AccountErrorMessages.INVALID_TRANSFER_TARGET,
        400,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const update = await tx.event.updateMany({
        where: { ownerAccountId: sourceAccountId },
        data: { ownerAccountId: targetAccountId },
      });

      // Mirror eventService.createEvent's role promotion: if the new
      // owner is still `player`, lift them to `account_owner`. Guarded
      // by `where.role` so admins and existing organizers aren't
      // touched. Only run when there was something to transfer —
      // assigning ownership of zero events shouldn't change roles.
      if (update.count > 0) {
        await tx.account.updateMany({
          where: { id: targetAccountId, role: 'player' },
          data: { role: 'account_owner' },
        });
      }

      return update.count;
    });

    return { transferred: result };
  }
}
