import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AccountService } from '../services/account.service';
import accountRoutes from '../routes/account.routes';
import sessionRoutes from '../routes/session.routes';

const prisma = new PrismaClient();
const accountService = new AccountService(prisma);

// Create a test app without starting the server
const createTestApp = () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/accounts', accountRoutes);
  testApp.use('/api/sessions', sessionRoutes);
  return testApp;
};

const app = createTestApp();

describe('Account Routes Integration Tests', () => {
  const testAccountIds: string[] = [];
  const testEmails: string[] = [];

  afterAll(async () => {
    // Clean up test accounts
    if (testEmails.length > 0) {
      await prisma.account.deleteMany({
        where: { email: { in: testEmails } },
      });
    }
    await prisma.$disconnect();
  });

  describe('Registration → Login → Profile Flow', () => {
    const testEmail = `integration-test-${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    let authToken: string;

    beforeAll(() => {
      testEmails.push(testEmail);
    });

    it('registers a new account', async () => {
      const response = await request(app)
        .post('/api/accounts/register')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(201);
      expect(response.body.account).toBeDefined();
      expect(response.body.account.email).toBe(testEmail);
      expect(response.body.account.role).toBe('account_owner');
      expect(response.body.account.status).toBe('active');
      expect(response.body.message).toContain('erfolgreich');
    });

    it('logs in with the registered account', async () => {
      const response = await request(app)
        .post('/api/accounts/login')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.account.email).toBe(testEmail);

      authToken = response.body.token;
    });

    it('gets current account profile', async () => {
      const response = await request(app)
        .get('/api/accounts/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.account.email).toBe(testEmail);
    });
  });

  describe('Property 2: Email Uniqueness', () => {
    const duplicateEmail = `duplicate-test-${Date.now()}@example.com`;

    beforeAll(() => {
      testEmails.push(duplicateEmail);
    });

    it('rejects registration with existing email', async () => {
      // First registration
      await request(app)
        .post('/api/accounts/register')
        .send({ email: duplicateEmail, password: 'TestPass123' });

      // Second registration with same email
      const response = await request(app)
        .post('/api/accounts/register')
        .send({ email: duplicateEmail, password: 'DifferentPass456' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('EMAIL_EXISTS');
    });
  });

  describe('Property 4: Session Invalidation on Password Change', () => {
    const pwdChangeEmail = `pwd-change-${Date.now()}@example.com`;
    const originalPassword = 'Original123';
    const newPassword = 'NewPass456';
    let token1: string;
    let token2: string;

    beforeAll(() => {
      testEmails.push(pwdChangeEmail);
    });

    it('invalidates other sessions on password change', async () => {
      // Register
      await request(app)
        .post('/api/accounts/register')
        .send({ email: pwdChangeEmail, password: originalPassword });

      // Login from "device 1"
      const login1 = await request(app)
        .post('/api/accounts/login')
        .send({ email: pwdChangeEmail, password: originalPassword });
      token1 = login1.body.token;

      // Login from "device 2"
      const login2 = await request(app)
        .post('/api/accounts/login')
        .send({ email: pwdChangeEmail, password: originalPassword });
      token2 = login2.body.token;

      // Verify both tokens work
      const check1 = await request(app)
        .get('/api/accounts/me')
        .set('Authorization', `Bearer ${token1}`);
      expect(check1.status).toBe(200);

      const check2 = await request(app)
        .get('/api/accounts/me')
        .set('Authorization', `Bearer ${token2}`);
      expect(check2.status).toBe(200);

      // Change password using token1
      const pwdChange = await request(app)
        .patch('/api/accounts/me/password')
        .set('Authorization', `Bearer ${token1}`)
        .send({ currentPassword: originalPassword, newPassword });

      expect(pwdChange.status).toBe(200);

      // Token1 should still work (current session)
      const check1After = await request(app)
        .get('/api/accounts/me')
        .set('Authorization', `Bearer ${token1}`);
      expect(check1After.status).toBe(200);

      // Token2 should be invalidated
      const check2After = await request(app)
        .get('/api/accounts/me')
        .set('Authorization', `Bearer ${token2}`);
      expect(check2After.status).toBe(401);
    });
  });

  describe('Property 5: Deactivated Account Login Prevention', () => {
    const deactivateEmail = `deactivate-${Date.now()}@example.com`;
    const testPassword = 'TestPass123';

    beforeAll(() => {
      testEmails.push(deactivateEmail);
    });

    it('prevents login after account deactivation', async () => {
      // Register and login
      await request(app)
        .post('/api/accounts/register')
        .send({ email: deactivateEmail, password: testPassword });

      const loginResponse = await request(app)
        .post('/api/accounts/login')
        .send({ email: deactivateEmail, password: testPassword });

      const token = loginResponse.body.token;

      // Deactivate account
      const deactivateResponse = await request(app)
        .post('/api/accounts/me/deactivate')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: testPassword });

      expect(deactivateResponse.status).toBe(200);

      // Try to login again
      const loginAfterDeactivate = await request(app)
        .post('/api/accounts/login')
        .send({ email: deactivateEmail, password: testPassword });

      expect(loginAfterDeactivate.status).toBe(403);
      expect(loginAfterDeactivate.body.error).toBe('ACCOUNT_DEACTIVATED');
    });
  });

  describe('Property 6: Role Promotion Authorization', () => {
    const adminEmail = `admin-${Date.now()}@example.com`;
    const regularEmail = `regular-${Date.now()}@example.com`;
    const targetEmail = `target-${Date.now()}@example.com`;
    let adminToken: string;
    let regularToken: string;
    let targetAccountId: string;

    beforeAll(async () => {
      testEmails.push(adminEmail, regularEmail, targetEmail);

      // Create admin account directly in DB
      const adminAccount = await prisma.account.create({
        data: {
          email: adminEmail,
          passwordHash: await accountService.hashPassword('AdminPass123'),
          role: 'admin',
          status: 'active',
        },
      });
      testAccountIds.push(adminAccount.id);

      // Login as admin
      const adminLogin = await request(app)
        .post('/api/accounts/login')
        .send({ email: adminEmail, password: 'AdminPass123' });
      adminToken = adminLogin.body.token;

      // Register regular user
      await request(app)
        .post('/api/accounts/register')
        .send({ email: regularEmail, password: 'RegularPass123' });

      const regularLogin = await request(app)
        .post('/api/accounts/login')
        .send({ email: regularEmail, password: 'RegularPass123' });
      regularToken = regularLogin.body.token;

      // Register target user
      const targetRegister = await request(app)
        .post('/api/accounts/register')
        .send({ email: targetEmail, password: 'TargetPass123' });
      targetAccountId = targetRegister.body.account.id;
    });

    it('allows admin to promote account', async () => {
      const response = await request(app)
        .post(`/api/accounts/${targetAccountId}/promote`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.account.role).toBe('admin');
    });

    it('rejects promotion by non-admin', async () => {
      // Create another target
      const anotherTarget = `another-target-${Date.now()}@example.com`;
      testEmails.push(anotherTarget);

      const register = await request(app)
        .post('/api/accounts/register')
        .send({ email: anotherTarget, password: 'AnotherPass123' });

      const response = await request(app)
        .post(`/api/accounts/${register.body.account.id}/promote`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('NOT_AUTHORIZED');
    });
  });

  describe('Session Management', () => {
    const sessionEmail = `session-${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    let authToken: string;

    beforeAll(() => {
      testEmails.push(sessionEmail);
    });

    it('lists active sessions', async () => {
      // Register and login
      await request(app)
        .post('/api/accounts/register')
        .send({ email: sessionEmail, password: testPassword });

      const loginResponse = await request(app)
        .post('/api/accounts/login')
        .send({ email: sessionEmail, password: testPassword });

      authToken = loginResponse.body.token;

      // Get sessions
      const sessionsResponse = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(sessionsResponse.status).toBe(200);
      expect(sessionsResponse.body.sessions).toBeInstanceOf(Array);
      expect(sessionsResponse.body.sessions.length).toBeGreaterThan(0);

      // Current session should be marked
      const currentSession = sessionsResponse.body.sessions.find(
        (s: { isCurrent: boolean }) => s.isCurrent
      );
      expect(currentSession).toBeDefined();
    });
  });
});
