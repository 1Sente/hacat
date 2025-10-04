import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserInfo } from '../services/keycloak';

// Extend Express Request interface to include user info
declare global {
  namespace Express {
    interface Request {
      user?: UserInfo;
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Middleware to verify JWT token from Authorization header
 */
export const verifyTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'No token provided',
        message: 'Authorization header with Bearer token is required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      res.status(401).json({
        error: 'Invalid token format',
        message: 'Token is required after Bearer'
      });
      return;
    }

    // Verify token with Keycloak
    const userInfo = await verifyToken(token);
    
    // Attach user info to request
    req.user = userInfo;
    req.userId = userInfo.sub;
    req.userRole = determineUserRole(userInfo);
    
    console.log(`Authenticated user: ${userInfo.preferred_username} (${req.userRole})`);
    next();
    
  } catch (error) {
    console.error('Token verification failed:', error);
    
    res.status(401).json({
      error: 'Token verification failed',
      message: error instanceof Error ? error.message : 'Invalid token'
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userRole) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'User must be authenticated'
    });
    return;
  }

  if (req.userRole !== 'admin') {
    res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Admin role required'
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user has approver role or higher
 */
export const requireApprover = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userRole) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'User must be authenticated'
    });
    return;
  }

  if (!['admin', 'approver'].includes(req.userRole)) {
    res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Approver role or higher required'
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user has any authenticated role
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userRole) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'User must be authenticated'
    });
    return;
  }

  next();
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        const userInfo = await verifyToken(token);
        req.user = userInfo;
        req.userId = userInfo.sub;
        req.userRole = determineUserRole(userInfo);
      }
    }
    
    next();
  } catch (error) {
    // Don't fail on optional auth, just continue without user info
    console.log('Optional auth failed, continuing without user info');
    next();
  }
};

/**
 * Determine user role from Keycloak user info
 */
function determineUserRole(userInfo: UserInfo): string {
  const roles = userInfo.realm_access?.roles || [];
  
  if (roles.includes('admin') || roles.includes('realm-admin')) {
    return 'admin';
  } else if (roles.includes('approver')) {
    return 'approver';
  } else {
    return 'user';
  }
}

/**
 * Middleware to log requests for audit purposes
 */
export const auditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    console.log(`[AUDIT] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, {
      userId: req.userId,
      userRole: req.userRole,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    return originalJson.call(this, body);
  };
  
  next();
};
