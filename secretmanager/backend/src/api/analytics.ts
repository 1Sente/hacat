import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/analytics/overview
 * Get overview statistics (admin/approver only)
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    // Get statistics from database
    const totalRequests = await prisma.request.count();
    const pendingRequests = await prisma.request.count({ where: { status: 'pending' } });
    const approvedRequests = await prisma.request.count({ where: { status: 'approved' } });
    const rejectedRequests = await prisma.request.count({ where: { status: 'rejected' } });
    const totalUsers = await prisma.user.count();
    const totalSecrets = await prisma.request.count({ where: { secretName: { not: null } } });
    
    const approvalRate = totalRequests > 0 
      ? Math.round((approvedRequests / totalRequests) * 100) 
      : 0;

    // Get requests grouped by date (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentRequests = await prisma.request.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by date
    const requestsByDate = recentRequests.reduce((acc: any[], req) => {
      const date = req.createdAt.toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, []);

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        actorUser: { select: { username: true } },
        request: { select: { id: true, resource: true } }
      }
    });

    res.json({
      success: true,
      overview: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        totalUsers,
        totalSecrets,
        approvalRate
      },
      requestsByDate,
      requestsByStatus: [
        { status: 'pending', count: pendingRequests },
        { status: 'approved', count: approvedRequests },
        { status: 'rejected', count: rejectedRequests }
      ],
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        action: log.action,
        actor: log.actorUser?.username || log.actor,
        details: log.details,
        timestamp: log.timestamp,
        requestId: log.requestId
      }))
    });

  } catch (error) {
    console.error('Error getting analytics overview:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get analytics overview'
    });
  }
});

/**
 * GET /api/analytics/requests
 * Get request analytics (admin/approver only)
 */
router.get('/requests', async (req: Request, res: Response) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;

    // Calculate date range
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const requests = await prisma.request.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      include: {
        requester: { select: { username: true } },
        approver: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      requests: requests.map(req => ({
        id: req.id,
        resource: req.resource,
        reason: req.reason,
        status: req.status,
        requester: req.requester?.username,
        approver: req.approver?.username,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt
      })),
      summary: {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length
      }
    });

  } catch (error) {
    console.error('Error getting request analytics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get request analytics'
    });
  }
});

/**
 * GET /api/analytics/users
 * Get user analytics (admin/approver only)
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            requests: true,
            approvedRequests: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        requestsCount: user._count.requests,
        approvalsCount: user._count.approvedRequests,
        createdAt: user.createdAt
      })),
      summary: {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        approvers: users.filter(u => u.role === 'approver').length,
        users: users.filter(u => u.role === 'user').length
      }
    });

  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user analytics'
    });
  }
});

/**
 * GET /api/analytics/audit
 * Get audit log (admin/approver only)
 */
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    const limitNum = parseInt(limit as string, 10);

    const auditLogs = await prisma.auditLog.findMany({
      take: limitNum,
      orderBy: { timestamp: 'desc' },
      include: {
        actorUser: { select: { username: true, role: true } },
        request: { select: { id: true, resource: true, status: true } }
      }
    });

    res.json({
      success: true,
      audit: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        actor: log.actorUser?.username || log.actor,
        actorRole: log.actorUser?.role,
        details: log.details,
        requestId: log.requestId,
        request: log.request,
        timestamp: log.timestamp
      })),
      total: await prisma.auditLog.count()
    });

  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get audit log'
    });
  }
});

export default router;