import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { logInfo, logError, logWarning } from '../utils/logger';
import { cacheService } from './cache';
import { pushNotificationService } from './pushNotifications';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  username?: string;
}

export interface SocketEvent {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface NotificationData {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private userRooms: Map<string, Set<string>> = new Map(); // userId -> Set of room names
  private roomUsers: Map<string, Set<string>> = new Map(); // room name -> Set of userIds

  private constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.server.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  static getInstance(server?: HTTPServer): WebSocketService {
    if (!WebSocketService.instance && server) {
      WebSocketService.instance = new WebSocketService(server);
    }
    return WebSocketService.instance;
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.security.jwtSecret) as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        socket.username = decoded.username;

        logInfo('WebSocket user authenticated', { 
          userId: socket.userId, 
          username: socket.username,
          socketId: socket.id 
        });

        next();
      } catch (error) {
        logError('WebSocket authentication failed', error as Error);
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const userId = socket.userId!;
    
    try {
      // Store connected user
      this.connectedUsers.set(userId, socket);
      
      // Join user to their personal room
      await socket.join(`user:${userId}`);
      this.addUserToRoom(userId, `user:${userId}`);

      // Join user to general rooms
      await socket.join('general');
      this.addUserToRoom(userId, 'general');

      // If user is admin, join admin room
      if (socket.userRole === 'ADMIN') {
        await socket.join('admin');
        this.addUserToRoom(userId, 'admin');
      }

      logInfo('User connected to WebSocket', { 
        userId, 
        username: socket.username,
        socketId: socket.id,
        totalConnections: this.connectedUsers.size 
      });

      // Send connection confirmation
      socket.emit('connected', {
        message: 'Successfully connected to real-time updates',
        userId,
        timestamp: new Date()
      });

      // Send pending notifications
      await this.sendPendingNotifications(userId);

      // Handle custom events
      this.setupSocketEventHandlers(socket);

    } catch (error) {
      logError('Error handling WebSocket connection', error as Error, { userId });
    }
  }

  private setupSocketEventHandlers(socket: AuthenticatedSocket): void {
    // Handle joining specific rooms
    socket.on('join_room', async (data: { room: string }) => {
      try {
        const { room } = data;
        await socket.join(room);
        this.addUserToRoom(socket.userId!, room);
        
        socket.emit('room_joined', { room, timestamp: new Date() });
        logInfo('User joined room', { userId: socket.userId, room });
      } catch (error) {
        logError('Error joining room', error as Error, { userId: socket.userId, room: data.room });
      }
    });

    // Handle leaving rooms
    socket.on('leave_room', async (data: { room: string }) => {
      try {
        const { room } = data;
        await socket.leave(room);
        this.removeUserFromRoom(socket.userId!, room);
        
        socket.emit('room_left', { room, timestamp: new Date() });
        logInfo('User left room', { userId: socket.userId, room });
      } catch (error) {
        logError('Error leaving room', error as Error, { userId: socket.userId, room: data.room });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { room: string, type: string }) => {
      socket.to(data.room).emit('user_typing', {
        userId: socket.userId,
        username: socket.username,
        type: data.type,
        timestamp: new Date()
      });
    });

    socket.on('typing_stop', (data: { room: string, type: string }) => {
      socket.to(data.room).emit('user_stopped_typing', {
        userId: socket.userId,
        username: socket.username,
        type: data.type,
        timestamp: new Date()
      });
    });

    // Handle presence updates
    socket.on('presence_update', (data: { status: 'online' | 'away' | 'busy' | 'offline' }) => {
      this.broadcastToUserConnections(socket.userId!, 'presence_updated', {
        userId: socket.userId,
        status: data.status,
        timestamp: new Date()
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    
    try {
      // Remove from connected users
      this.connectedUsers.delete(userId);
      
      // Remove from all rooms
      const userRooms = this.userRooms.get(userId) || new Set();
      userRooms.forEach(room => {
        this.removeUserFromRoom(userId, room);
      });
      this.userRooms.delete(userId);

      logInfo('User disconnected from WebSocket', { 
        userId, 
        username: socket.username,
        socketId: socket.id,
        totalConnections: this.connectedUsers.size 
      });

      // Notify connections that user went offline
      this.broadcastToRoom('general', 'user_offline', {
        userId,
        username: socket.username,
        timestamp: new Date()
      });

    } catch (error) {
      logError('Error handling WebSocket disconnection', error as Error, { userId });
    }
  }

  private addUserToRoom(userId: string, room: string): void {
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId)!.add(room);

    if (!this.roomUsers.has(room)) {
      this.roomUsers.set(room, new Set());
    }
    this.roomUsers.get(room)!.add(userId);
  }

  private removeUserFromRoom(userId: string, room: string): void {
    this.userRooms.get(userId)?.delete(room);
    this.roomUsers.get(room)?.delete(userId);
  }

  // Public methods for broadcasting events

  /**
   * Send notification to a specific user
   */
  async sendNotification(userId: string, notification: Omit<NotificationData, 'id' | 'userId' | 'createdAt'>): Promise<void> {
    try {
      // Save notification to database
      const savedNotification = await prisma.notification.create({
        data: {
          userId,
          type: notification.type.toUpperCase() as any,
          title: notification.title,
          message: notification.message,
          data: notification.data ? JSON.stringify(notification.data) : null,
          read: notification.read
        }
      });

      // Send via WebSocket if user is connected
      const socket = this.connectedUsers.get(userId);
      if (socket) {
        socket.emit('notification', {
          ...savedNotification,
          data: notification.data
        });
      }

      // Also send push notification
      await pushNotificationService.sendToUser(userId, {
        title: notification.title,
        body: notification.message,
        icon: '/icons/notification.png',
        badge: '/icons/badge.png',
        data: {
          type: notification.type,
          notificationId: savedNotification.id,
          ...notification.data
        },
        tag: `notification-${savedNotification.id}`
      });

      // Cache notification for offline users
      await cacheService.set(`notification:${userId}:${savedNotification.id}`, savedNotification, { ttl: 86400 });

      logInfo('Notification sent', { userId, notificationId: savedNotification.id, type: notification.type });
    } catch (error) {
      logError('Error sending notification', error as Error, { userId, notification });
    }
  }

  /**
   * Broadcast to all users in a room
   */
  broadcastToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast to all connected users
   */
  broadcastToAll(event: string, data: any): void {
    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast to all connections of a specific user
   */
  broadcastToUserConnections(userId: string, event: string, data: any): void {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit(event, {
        ...data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast to admin users only
   */
  broadcastToAdmins(event: string, data: any): void {
    this.io.to('admin').emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Send real-time post update
   */
  async broadcastPostUpdate(postId: string, action: 'created' | 'updated' | 'deleted', postData?: any): Promise<void> {
    try {
      const eventData = {
        postId,
        action,
        post: postData,
        timestamp: new Date()
      };

      // Broadcast to general room
      this.broadcastToRoom('general', 'post_update', eventData);

      // If it's a new post, notify followers
      if (action === 'created' && postData?.userId) {
        const followers = await this.getUserFollowers(postData.userId);
        followers.forEach(followerId => {
          this.sendNotification(followerId, {
            type: 'mention',
            title: 'New Post',
            message: `${postData.user?.name || 'Someone'} posted something new`,
            data: { postId, post: postData },
            read: false
          });
        });
      }

      logInfo('Post update broadcasted', { postId, action });
    } catch (error) {
      logError('Error broadcasting post update', error as Error, { postId, action });
    }
  }

  /**
   * Send real-time like update
   */
  async broadcastLikeUpdate(postId: string, userId: string, action: 'liked' | 'unliked'): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, username: true }
      });

      const eventData = {
        postId,
        userId,
        username: user?.username,
        user: user,
        action,
        timestamp: new Date()
      };

      // Broadcast to post room
      this.broadcastToRoom(`post:${postId}`, 'like_update', eventData);

      // Notify post owner if it's a like
      if (action === 'liked') {
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { userId: true }
        });

        if (post && post.userId !== userId) {
          await this.sendNotification(post.userId, {
            type: 'like',
            title: 'New Like',
            message: `${user?.name || 'Someone'} liked your post`,
            data: { postId, likerId: userId },
            read: false
          });
        }
      }

      logInfo('Like update broadcasted', { postId, userId, action });
    } catch (error) {
      logError('Error broadcasting like update', error as Error, { postId, userId, action });
    }
  }

  /**
   * Send real-time comment update
   */
  async broadcastCommentUpdate(postId: string, commentId: string, action: 'created' | 'updated' | 'deleted', commentData?: any): Promise<void> {
    try {
      const eventData = {
        postId,
        commentId,
        action,
        comment: commentData,
        timestamp: new Date()
      };

      // Broadcast to post room
      this.broadcastToRoom(`post:${postId}`, 'comment_update', eventData);

      // Notify post owner if it's a new comment
      if (action === 'created' && commentData?.userId) {
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { userId: true }
        });

        if (post && post.userId !== commentData.userId) {
          const commenter = await prisma.user.findUnique({
            where: { id: commentData.userId },
            select: { name: true, username: true }
          });

          await this.sendNotification(post.userId, {
            type: 'comment',
            title: 'New Comment',
            message: `${commenter?.name || 'Someone'} commented on your post`,
            data: { postId, commentId, commenterId: commentData.userId },
            read: false
          });
        }
      }

      logInfo('Comment update broadcasted', { postId, commentId, action });
    } catch (error) {
      logError('Error broadcasting comment update', error as Error, { postId, commentId, action });
    }
  }

  /**
   * Send real-time connection update
   */
  async broadcastConnectionUpdate(userId: string, connectedUserId: string, action: 'connected' | 'disconnected'): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, username: true }
      });

      const eventData = {
        userId,
        connectedUserId,
        user,
        action,
        timestamp: new Date()
      };

      // Notify both users
      this.broadcastToUserConnections(userId, 'connection_update', eventData);
      this.broadcastToUserConnections(connectedUserId, 'connection_update', eventData);

      // Send notification
      if (action === 'connected') {
        await this.sendNotification(connectedUserId, {
          type: 'follow',
          title: 'New Connection',
          message: `${user?.name || 'Someone'} connected with you`,
          data: { userId, connectedUserId },
          read: false
        });
      }

      logInfo('Connection update broadcasted', { userId, connectedUserId, action });
    } catch (error) {
      logError('Error broadcasting connection update', error as Error, { userId, connectedUserId, action });
    }
  }

  /**
   * Send system-wide announcement
   */
  async broadcastSystemAnnouncement(title: string, message: string, data?: any): Promise<void> {
    try {
      const announcement = {
        title,
        message,
        data,
        timestamp: new Date()
      };

      this.broadcastToAll('system_announcement', announcement);

      // Save as notification for all users
      const users = await prisma.user.findMany({
        select: { id: true }
      });

      for (const user of users) {
        await this.sendNotification(user.id, {
          type: 'system',
          title,
          message,
          data,
          read: false
        });
      }

      logInfo('System announcement broadcasted', { title, message });
    } catch (error) {
      logError('Error broadcasting system announcement', error as Error, { title, message });
    }
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get connected users list
   */
  getConnectedUsers(): Array<{ userId: string; username?: string; userRole?: string }> {
    return Array.from(this.connectedUsers.values()).map(socket => ({
      userId: socket.userId!,
      username: socket.username,
      userRole: socket.userRole
    }));
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Send pending notifications to user
   */
  private async sendPendingNotifications(userId: string): Promise<void> {
    try {
      // Get cached notifications
      const cachedNotifications = await cacheService.keys(`notification:${userId}:*`);
      
      for (const key of cachedNotifications) {
        const notification = await cacheService.get(key);
        if (notification) {
          const socket = this.connectedUsers.get(userId);
          if (socket) {
            socket.emit('notification', notification);
          }
        }
      }

      logInfo('Pending notifications sent', { userId, count: cachedNotifications.length });
    } catch (error) {
      logError('Error sending pending notifications', error as Error, { userId });
    }
  }

  /**
   * Get user followers for notifications
   */
  private async getUserFollowers(userId: string): Promise<string[]> {
    try {
      const connections = await prisma.connection.findMany({
        where: {
          connectedUserId: userId,
          status: 'CONNECTED'
        },
        select: { userId: true }
      });

      return connections.map(conn => conn.userId);
    } catch (error) {
      logError('Error getting user followers', error as Error, { userId });
      return [];
    }
  }
}

// Export singleton instance
export const webSocketService = WebSocketService.getInstance();
