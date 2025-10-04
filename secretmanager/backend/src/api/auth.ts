import { Router, Request, Response } from 'express';
import { verifyTokenMiddleware, requireAuth } from '../middleware/verifyToken';

const router = Router();

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', verifyTokenMiddleware, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
    }

    const userInfo = req.user;
    const roles = userInfo.realm_access?.roles || [];

    res.json({
      success: true,
      user: {
        id: userInfo.sub,
        username: userInfo.preferred_username,
        email: userInfo.email,
        firstName: userInfo.given_name,
        lastName: userInfo.family_name,
        role: req.userRole,
        roles: roles
      }
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user information'
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify token and return user info
 */
router.post('/verify', verifyTokenMiddleware, (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      valid: true,
      user: {
        id: req.user?.sub,
        username: req.user?.preferred_username,
        role: req.userRole
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify token'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh token (placeholder - Keycloak handles this)
 */
router.post('/refresh', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Token refresh should be handled by Keycloak client'
  });
});

/**
 * POST /api/auth/logout
 * Logout (placeholder - Keycloak handles this)
 */
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout should be handled by Keycloak client'
  });
});

export default router;
