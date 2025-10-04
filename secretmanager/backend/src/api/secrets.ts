import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyTokenMiddleware, requireAuth } from '../middleware/verifyToken';
import { openBaoService } from '../services/openbao';
import WebSocketService from '../services/websocket';

const router = Router();
const prisma = new PrismaClient();

// We'll set this from the main app
let webSocketService: WebSocketService | null = null;

export const setWebSocketService = (wsService: WebSocketService) => {
  webSocketService = wsService;
};

/**
 * GET /api/secrets/:name
 * Retrieve a secret from OpenBao (only if user has access to the request)
 */
router.get('/:name', verifyTokenMiddleware, async (req: Request, res: Response) => {
  try {
    const secretName = req.params.name;
    const userId = req.userId!;
    const userRole = req.userRole!;

    // Find the request associated with this secret
    const request = await prisma.request.findUnique({
      where: { secretName },
      include: {
        requester: true
      }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Secret not found',
        message: 'No request found for this secret name'
      });
    }

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'approver') {
      // Regular users can only access their own secrets
      const user = await prisma.user.findUnique({
        where: { username: req.user!.preferred_username }
      });
      
      if (!user || request.requesterId !== user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access secrets from your own approved requests'
        });
      }
    }

    // Check if request is approved
    if (request.status !== 'approved') {
      return res.status(400).json({
        error: 'Secret not available',
        message: `Request status is ${request.status}. Secret is only available for approved requests.`
      });
    }

    // Retrieve secret from OpenBao
    let secretData;
    try {
      secretData = await openBaoService.getSecret(secretName);
    } catch (error) {
      console.error('Failed to retrieve secret from OpenBao:', error);
      return res.status(500).json({
        error: 'Failed to retrieve secret',
        message: 'Could not retrieve secret from storage'
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'SECRET_ACCESSED',
        actor: req.user!.preferred_username,
        actorUserId: (await prisma.user.findUnique({
          where: { username: req.user!.preferred_username }
        }))?.id,
        requestId: request.id,
        details: `Secret accessed: ${secretName}`
      }
    });

    // Notify user via WebSocket
    if (webSocketService) {
      webSocketService.notifySecretAccess(
        request.requesterId?.toString() || '',
        secretName,
        true
      );
    }

    res.json({
      success: true,
      secret: {
        name: secretName,
        data: secretData,
        requestId: request.id,
        resource: request.resource,
        accessedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error retrieving secret:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve secret'
    });
  }
});

/**
 * POST /api/secrets
 * Create a new secret (admin only)
 */
router.post('/', verifyTokenMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, data, description } = req.body;
    const userRole = req.userRole!;

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin role required to create secrets'
      });
    }

    if (!name || !data || typeof data !== 'object') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Name and data are required. Data must be an object.'
      });
    }

    // Check if secret name already exists
    const existingRequest = await prisma.request.findUnique({
      where: { secretName: name }
    });

    if (existingRequest) {
      return res.status(409).json({
        error: 'Secret already exists',
        message: 'A secret with this name already exists'
      });
    }

    // Store secret in OpenBao
    try {
      await openBaoService.setSecret(name, data);
    } catch (error) {
      console.error('Failed to store secret in OpenBao:', error);
      return res.status(500).json({
        error: 'Failed to store secret',
        message: 'Could not store secret in storage'
      });
    }

    // Create a dummy request record for tracking
    const request = await prisma.request.create({
      data: {
        resource: description || `Admin-created secret: ${name}`,
        reason: 'Admin-created secret',
        requesterId: (await prisma.user.findUnique({
          where: { username: req.user!.preferred_username }
        }))?.id,
        status: 'approved',
        secretName: name
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'SECRET_CREATED',
        actor: req.user!.preferred_username,
        actorUserId: (await prisma.user.findUnique({
          where: { username: req.user!.preferred_username }
        }))?.id,
        requestId: request.id,
        details: `Admin created secret: ${name}`
      }
    });

    res.status(201).json({
      success: true,
      message: 'Secret created successfully',
      secret: {
        name,
        requestId: request.id,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating secret:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create secret'
    });
  }
});

/**
 * PUT /api/secrets/:name
 * Update/edit a secret (admin only)
 */
router.put('/:name', verifyTokenMiddleware, async (req: Request, res: Response) => {
  try {
    const secretName = req.params.name;
    const { data, description } = req.body;
    const userRole = req.userRole!;

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin role required to edit secrets'
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Data is required and must be an object'
      });
    }

    // Find the request associated with this secret
    const request = await prisma.request.findUnique({
      where: { secretName }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Secret not found',
        message: 'No secret found with this name'
      });
    }

    // Update secret in OpenBao
    try {
      await openBaoService.setSecret(secretName, data);
    } catch (error) {
      console.error('Failed to update secret in OpenBao:', error);
      return res.status(500).json({
        error: 'Failed to update secret',
        message: 'Could not update secret in storage'
      });
    }

    // Update request description if provided
    if (description) {
      await prisma.request.update({
        where: { id: request.id },
        data: {
          resource: description
        }
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'SECRET_UPDATED',
        actor: req.user!.preferred_username,
        actorUserId: (await prisma.user.findUnique({
          where: { username: req.user!.preferred_username }
        }))?.id,
        requestId: request.id,
        details: `Secret updated: ${secretName}`
      }
    });

    res.json({
      success: true,
      message: 'Secret updated successfully',
      secret: {
        name: secretName,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating secret:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update secret'
    });
  }
});

/**
 * GET /api/secrets
 * List all secrets (admin/approver only)
 */
router.get('/', verifyTokenMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = req.userRole!;

    // Only admins and approvers can list all secrets
    if (userRole !== 'admin' && userRole !== 'approver') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin or approver role required'
      });
    }

    // Get all approved requests with secrets
    const requests = await prisma.request.findMany({
      where: {
        status: 'approved',
        secretName: { not: null }
      },
      include: {
        requester: { select: { username: true, email: true } },
        approver: { select: { username: true, email: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Try to get secret names from OpenBao
    let openBaoSecrets: string[] = [];
    try {
      openBaoSecrets = await openBaoService.listSecrets();
    } catch (error) {
      console.warn('Could not list secrets from OpenBao:', error);
    }

    res.json({
      success: true,
      secrets: requests.map(req => ({
        name: req.secretName,
        requestId: req.id,
        resource: req.resource,
        requester: req.requester?.username,
        approver: req.approver?.username,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        existsInOpenBao: openBaoSecrets.includes(req.secretName!)
      })),
      total: requests.length
    });

  } catch (error) {
    console.error('Error listing secrets:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to list secrets'
    });
  }
});

/**
 * DELETE /api/secrets/:name
 * Delete a secret (admin only)
 */
router.delete('/:name', verifyTokenMiddleware, async (req: Request, res: Response) => {
  try {
    const secretName = req.params.name;
    const userRole = req.userRole!;

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin role required to delete secrets'
      });
    }

    // Find the request associated with this secret
    const request = await prisma.request.findUnique({
      where: { secretName }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Secret not found',
        message: 'No request found for this secret name'
      });
    }

    // Note: OpenBao doesn't have a direct delete endpoint in the same way
    // We'll mark the secret as deleted in our database
    await prisma.request.update({
      where: { id: request.id },
      data: {
        secretName: null,
        status: 'expired'
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'SECRET_DELETED',
        actor: req.user!.preferred_username,
        actorUserId: (await prisma.user.findUnique({
          where: { username: req.user!.preferred_username }
        }))?.id,
        requestId: request.id,
        details: `Secret deleted: ${secretName}`
      }
    });

    res.json({
      success: true,
      message: 'Secret deleted successfully',
      secretName
    });

  } catch (error) {
    console.error('Error deleting secret:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete secret'
    });
  }
});

/**
 * POST /api/secrets/:name/rotate
 * Rotate a secret (admin only)
 */
router.post('/:name/rotate', verifyTokenMiddleware, async (req: Request, res: Response) => {
  try {
    const secretName = req.params.name;
    const { newSecretData } = req.body;
    const userRole = req.userRole!;

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin role required to rotate secrets'
      });
    }

    if (!newSecretData || typeof newSecretData !== 'object') {
      return res.status(400).json({
        error: 'Invalid secret data',
        message: 'New secret data must be provided as an object'
      });
    }

    // Find the request associated with this secret
    const request = await prisma.request.findUnique({
      where: { secretName }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Secret not found',
        message: 'No request found for this secret name'
      });
    }

    // Update secret in OpenBao
    try {
      await openBaoService.setSecret(secretName, newSecretData);
    } catch (error) {
      console.error('Failed to rotate secret in OpenBao:', error);
      return res.status(500).json({
        error: 'Failed to rotate secret',
        message: 'Could not update secret in storage'
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'SECRET_ROTATED',
        actor: req.user!.preferred_username,
        actorUserId: (await prisma.user.findUnique({
          where: { username: req.user!.preferred_username }
        }))?.id,
        requestId: request.id,
        details: `Secret rotated: ${secretName}`
      }
    });

    res.json({
      success: true,
      message: 'Secret rotated successfully',
      secretName,
      rotatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error rotating secret:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to rotate secret'
    });
  }
});

export default router;
