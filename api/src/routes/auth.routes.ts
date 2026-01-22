import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';

const router = Router();

/**
 * POST /api/auth/verify
 * Verifies the provided password against the event password.
 * 
 * Request body: { password: string }
 * Response: 
 *   - 200 { success: true } if password matches
 *   - 401 { success: false, message: "Falsches Passwort" } if password is incorrect
 *   - 400 { success: false, message: "Bitte Passwort eingeben." } if password is missing
 */
router.post('/verify', (req: Request, res: Response) => {
  const { password } = req.body;

  // Check if password is provided
  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Bitte Passwort eingeben.',
    });
  }

  // Verify password
  const isValid = authService.verifyPassword(password);

  if (isValid) {
    return res.json({ success: true });
  }

  return res.status(401).json({
    success: false,
    message: 'Falsches Passwort',
  });
});

export default router;
