import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service';

const router = Router();

/**
 * GET /api/users
 * Returns all users sorted by name.
 *
 * Response: { users: User[] }
 *
 * Requirements: 3.1
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    return res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * GET /api/users/:id
 * Returns a single user by ID.
 *
 * Response: { user: User }
 *
 * Error responses:
 *   - 404 if user not found
 *
 * Requirements: 3.2, 3.3
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    return res.json({ user });
  } catch (error) {
    if (error instanceof Error) {
      // Handle user not found
      if (error.message === 'Benutzer nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
          },
        });
      }
    }
    console.error('Error fetching user:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * POST /api/users
 * Creates a new user.
 *
 * Request body: { name: string }
 * Response: { user: User }
 *
 * Error responses:
 *   - 400 if name is empty or whitespace-only
 *   - 409 if name already exists
 *
 * Requirements: 3.4, 3.5, 3.6
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (name === undefined || name === null || typeof name !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bitte einen Namen eingeben.',
        },
      });
    }

    const user = await userService.createUser(name);
    return res.status(201).json({ user });
  } catch (error) {
    if (error instanceof Error) {
      // Handle empty/whitespace name
      if (error.message === 'Bitte einen Namen eingeben.') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      // Handle name too long
      if (error.message === 'Der Name darf maximal 30 Zeichen lang sein.') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      // Handle duplicate name
      if (error.message === 'Ein Benutzer mit diesem Namen existiert bereits.') {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_USER',
            message: error.message,
          },
        });
      }
    }
    console.error('Error creating user:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * PATCH /api/users/:id
 * Updates a user's name.
 *
 * Request body: { name: string }
 * Response: { user: User }
 *
 * Error responses:
 *   - 400 if name is empty or whitespace-only
 *   - 404 if user not found
 *   - 409 if name already exists for another user
 *
 * Requirements: 3.7, 3.8, 3.9
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validate required fields
    if (name === undefined || name === null || typeof name !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bitte einen Namen eingeben.',
        },
      });
    }

    const user = await userService.updateUser(id, name);
    return res.json({ user });
  } catch (error) {
    if (error instanceof Error) {
      // Handle empty/whitespace name
      if (error.message === 'Bitte einen Namen eingeben.') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      // Handle name too long
      if (error.message === 'Der Name darf maximal 30 Zeichen lang sein.') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      // Handle user not found
      if (error.message === 'Benutzer nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
          },
        });
      }
      // Handle duplicate name
      if (error.message === 'Ein Benutzer mit diesem Namen existiert bereits.') {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_USER',
            message: error.message,
          },
        });
      }
    }
    console.error('Error updating user:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * DELETE /api/users/:id
 * Deletes a user and cascades to Player/Bringer records.
 *
 * Response: { success: true }
 *
 * Error responses:
 *   - 404 if user not found
 *
 * Requirements: 3.10
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    return res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      // Handle user not found
      if (error.message === 'Benutzer nicht gefunden.') {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
          },
        });
      }
    }
    console.error('Error deleting user:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

export default router;
