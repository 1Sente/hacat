import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyTokenMiddleware, requireApprover } from '../middleware/verifyToken';
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
 * POST /api/requests
 * Create a new request
 */
router.post('/', verifyTokenMiddleware, async (req: Request, res: Response) => {
  try {
    const { resource, reason } = req.body;
    const username = req.user!.preferred_username;

    if (!resource || !reason) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Resource and reason are required'
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username,
          email: req.user!.email,
          role: req.userRole || 'user'
        }
      });
    }

    // Create request
    const request = await prisma.request.create({
      data: {
        resource,
        reason,
        requesterId: user.id,
        status: 'pending'
      },
      include: {
        requester: { select: { username: true, email: true } }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'REQUEST_CREATED',
        actor: username,
        actorUserId: user.id,
        requestId: request.id,
        details: `Request created for resource: ${resource}`
      }
    });

    // Notify admins via WebSocket
    if (webSocketService) {
      webSocketService.notifyNewRequest(request);
    }

    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      request: {
        id: request.id,
        resource: request.resource,
        reason: request.reason,
        status: request.status,
        requester: request.requester,
        createdAt: request.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create request'
    });
  }
});

/**
 * GET /api/requests
 * Get all requests (admin/approver) or user's own requests
 */
router.get('/', verifyTokenMiddleware, async (req: Request, res: Response) => {
  try {
    const username = req.user!.preferred_username;
    const userRole = req.userRole!;
    const { status, limit, offset } = req.query;

    // Build query conditions
    let whereClause: any = {};

    // If user is not admin/approver, only show their own requests
    if (userRole !== 'admin' && userRole !== 'approver') {
      const user = await prisma.user.findUnique({
        where: { username }
      });
      
      if (!user) {
        return res.json({
          success: true,
          requests: []
        });
      }
      
      whereClause.requesterId = user.id;
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    const requests = await prisma.request.findMany({
      where: whereClause,
      include: {
        requester: { select: { username: true, email: true } },
        approver: { select: { username: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : undefined,
      skip: offset ? parseInt(offset as string) : undefined
    });

    res.json({
      success: true,
      requests: requests.map(req => ({
        id: req.id,
        resource: req.resource,
        reason: req.reason,
        status: req.status,
        secretName: req.secretName,
        requester: req.requester,
        approver: req.approver,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error getting requests:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get requests'
    });
  }
});

/**
 * GET /api/requests/:id
 * Get a specific request
 */
router.get('/:id', verifyTokenMiddleware, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const username = req.user!.preferred_username;
    const userRole = req.userRole!;

    if (isNaN(requestId)) {
      return res.status(400).json({
        error: 'Invalid request ID',
        message: 'Request ID must be a number'
      });
    }

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: { select: { username: true, email: true } },
        approver: { select: { username: true, email: true } }
      }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        message: 'The requested resource does not exist'
      });
    }

    // Check permissions - users can only see their own requests
    if (userRole !== 'admin' && userRole !== 'approver') {
      if (request.requester?.username !== username) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own requests'
        });
      }
    }

    res.json({
      success: true,
      request: {
        id: request.id,
        resource: request.resource,
        reason: request.reason,
        status: request.status,
        secretName: request.secretName,
        requester: request.requester,
        approver: request.approver,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get request'
    });
  }
});

/**
 * POST /api/requests/:id/approve
 * Approve a request (admin/approver only)
 */
router.post('/:id/approve', verifyTokenMiddleware, requireApprover, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const { secretData } = req.body;
    const username = req.user!.preferred_username;

    if (isNaN(requestId)) {
      return res.status(400).json({
        error: 'Invalid request ID',
        message: 'Request ID must be a number'
      });
    }

    if (!secretData || typeof secretData !== 'object') {
      return res.status(400).json({
        error: 'Invalid secret data',
        message: 'Secret data must be provided as an object'
      });
    }

    // Find request
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: true }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        message: 'The requested resource does not exist'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid request status',
        message: `Request is already ${request.status}`
      });
    }

    // Find or create approver user
    let approver = await prisma.user.findUnique({
      where: { username }
    });

    if (!approver) {
      approver = await prisma.user.create({
        data: {
          username,
          email: req.user!.email,
          role: req.userRole || 'approver'
        }
      });
    }

    // Generate secret name
    const secretName = `secret-${requestId}-${Date.now()}`;

    // Store secret in OpenBao
    try {
      await openBaoService.setSecret(secretName, secretData);
    } catch (error) {
      console.error('Failed to store secret in OpenBao:', error);
      return res.status(500).json({
        error: 'Failed to store secret',
        message: 'Could not store secret in OpenBao'
      });
    }

    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approverId: approver.id,
        secretName
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'REQUEST_APPROVED',
        actor: username,
        actorUserId: approver.id,
        requestId,
        details: `Request approved and secret created: ${secretName}`
      }
    });

    // Notify user via WebSocket
    if (webSocketService && request.requesterId) {
      webSocketService.notifyRequestStatusChange(
        request.requesterId.toString(),
        requestId,
        'approved',
        'Your request has been approved'
      );
    }

    res.json({
      success: true,
      message: 'Request approved successfully',
      requestId,
      secretName
    });

  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to approve request'
    });
  }
});

/**
 * POST /api/requests/:id/reject
 * Reject a request (admin/approver only)
 */
router.post('/:id/reject', verifyTokenMiddleware, requireApprover, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const { reason } = req.body;
    const username = req.user!.preferred_username;

    if (isNaN(requestId)) {
      return res.status(400).json({
        error: 'Invalid request ID',
        message: 'Request ID must be a number'
      });
    }

    // Find request
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: true }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        message: 'The requested resource does not exist'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid request status',
        message: `Request is already ${request.status}`
      });
    }

    // Find or create approver user
    let approver = await prisma.user.findUnique({
      where: { username }
    });

    if (!approver) {
      approver = await prisma.user.create({
        data: {
          username,
          email: req.user!.email,
          role: req.userRole || 'approver'
        }
      });
    }

    // Update request
    await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        approverId: approver.id
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'REQUEST_REJECTED',
        actor: username,
        actorUserId: approver.id,
        requestId,
        details: reason || 'Request rejected'
      }
    });

    // Notify user via WebSocket
    if (webSocketService && request.requesterId) {
      webSocketService.notifyRequestStatusChange(
        request.requesterId.toString(),
        requestId,
        'rejected',
        reason || 'Your request has been rejected'
      );
    }

    res.json({
      success: true,
      message: 'Request rejected successfully',
      requestId
    });

  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reject request'
    });
  }
});

export default router;