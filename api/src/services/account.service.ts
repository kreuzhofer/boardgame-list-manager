import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  AccountResponse,
  CreateAccountInput,
  AccountErrorCodes,
  AccountErrorMessages,
} from '../types/account';

const BCRYPT_COST_FACTOR = 12;

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
    createdAt: Date;
  }): AccountResponse {
    return {
      id: account.id,
      email: account.email,
      role: account.role as 'account_owner' | 'admin',
      status: account.status as 'active' | 'deactivated',
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
        role: 'account_owner',
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
}
