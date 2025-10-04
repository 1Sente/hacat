import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface AuthenticatedSocket {
  userId: string;
  username: string;
  role: string;
}

class WebSocketService {
  private io: SocketIOServer;
  private authenticatedSockets: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', (data: { token: string }) => {
        this.handleAuthentication(socket, data.token);
      });

      // Handle joining user-specific room
      socket.on('join-user-room', (data: { userId: string }) => {
        if (this.authenticatedSockets.has(socket.id)) {
          socket.join(`user-${data.userId}`);
          console.log(`User ${data.userId} joined their room`);
        }
      });

      // Handle joining admin room
      socket.on('join-admin-room', () => {
        const socketData = this.authenticatedSockets.get(socket.id);
        if (socketData && (socketData.role === 'admin' || socketData.role === 'approver')) {
          socket.join('admin-room');
          console.log(`Admin/Approver ${socketData.username} joined admin room`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.authenticatedSockets.delete(socket.id);
      });
    });
  }

  private async handleAuthentication(socket: any, token: string): Promise<void> {
    try {
      // Import here to avoid circular dependency
      const { verifyToken } = await import('./keycloak');
      const userInfo = await verifyToken(token);

      const socketData: AuthenticatedSocket = {
        userId: userInfo.sub,
        username: userInfo.preferred_username,
        role: this.determineUserRole(userInfo)
      };

      this.authenticatedSockets.set(socket.id, socketData);
      
      socket.emit('authenticated', {
        success: true,
        user: {
          id: socketData.userId,
          username: socketData.username,
          role: socketData.role
        }
      });

      console.log(`User authenticated: ${socketData.username} (${socketData.role})`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      socket.emit('authentication-error', {
        success: false,
        error: 'Invalid token'
      });
    }
  }

  private determineUserRole(userInfo: any): string {
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
   * Notify user about request status change
   */
  public notifyRequestStatusChange(userId: string, requestId: number, status: string, message?: string): void {
    this.io.to(`user-${userId}`).emit('request-status-changed', {
      requestId,
      status,
      message,
      timestamp: new Date().toISOString()
    });

    console.log(`Notified user ${userId} about request ${requestId} status change: ${status}`);
  }

  /**
   * Notify admins about new request
   */
  public notifyNewRequest(requestData: any): void {
    this.io.to('admin-room').emit('new-request', {
      request: requestData,
      timestamp: new Date().toISOString()
    });

    console.log(`Notified admins about new request: ${requestData.id}`);
  }

  /**
   * Notify user about secret access
   */
  public notifySecretAccess(userId: string, secretName: string, success: boolean): void {
    this.io.to(`user-${userId}`).emit('secret-access', {
      secretName,
      success,
      timestamp: new Date().toISOString()
    });

    console.log(`Notified user ${userId} about secret access: ${secretName}`);
  }

  /**
   * Broadcast system notification to all connected users
   */
  public broadcastSystemNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system-notification', {
      message,
      type,
      timestamp: new Date().toISOString()
    });

    console.log(`System notification broadcasted: ${message}`);
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.authenticatedSockets.size;
  }

  /**
   * Get connected users by role
   */
  public getConnectedUsersByRole(): { [role: string]: number } {
    const roleCount: { [role: string]: number } = {};
    
    this.authenticatedSockets.forEach((socketData) => {
      roleCount[socketData.role] = (roleCount[socketData.role] || 0) + 1;
    });

    return roleCount;
  }

  /**
   * Disconnect user by ID
   */
  public disconnectUser(userId: string): void {
    this.authenticatedSockets.forEach((socketData, socketId) => {
      if (socketData.userId === userId) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
          this.authenticatedSockets.delete(socketId);
          console.log(`Disconnected user: ${userId}`);
        }
      }
    });
  }
}

export default WebSocketService;
