import express from 'express';
import { createServer as createHttpServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Rate limiting config
const RATE_LIMIT_MAX = 100; // messages per window
const RATE_LIMIT_WINDOW = 60; // seconds

export interface UserData {
  userId: string;
  steamId: string;
  tier: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: UserData;
}

export interface ServerInstance {
  app: express.Application;
  httpServer: HttpServer;
  io: SocketIOServer;
}

export interface ServerOptions {
  rateLimitWindow?: number; // seconds
}

export function createServer(options: ServerOptions = {}): ServerInstance {
  const rateLimitWindow = options.rateLimitWindow || RATE_LIMIT_WINDOW;
  const app = express();
  const httpServer = createHttpServer(app);
  
  // Enable CORS
  app.use(cors());
  app.use(express.json());

  // Create Socket.io server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Simple in-memory rate limiter (replace with Redis in production)
  const rateLimiter = new Map<string, { count: number; resetTime: number }>();
  
  function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowMs = rateLimitWindow * 1000;
    
    let userLimit = rateLimiter.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      // New window
      userLimit = { count: 1, resetTime: now + windowMs };
      rateLimiter.set(userId, userLimit);
      return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetTime: userLimit.resetTime };
    }
    
    if (userLimit.count >= RATE_LIMIT_MAX) {
      return { allowed: false, remaining: 0, resetTime: userLimit.resetTime };
    }
    
    userLimit.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count, resetTime: userLimit.resetTime };
  }

  // Authentication middleware for Socket.io
  io.use((socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as UserData;
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  // Handle connections
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.id}, User: ${socket.user?.userId}`);
    
    // Send auth success
    socket.emit('AUTH_SUCCESS', {
      userId: socket.user?.userId,
      connected: true,
    });

    // Handle CHARACTER_CHAT messages
    socket.on('CHARACTER_CHAT', (data: any, callback?: (ack: any) => void) => {
      const userId = socket.user?.userId || 'anonymous';
      console.log(`Received CHARACTER_CHAT from ${userId}:`, data);
      
      // Check rate limit
      const rateLimit = checkRateLimit(userId);
      if (!rateLimit.allowed) {
        const error = { 
          error: 'Rate limit exceeded', 
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        };
        if (callback) callback(error);
        socket.emit('ERROR', error);
        return;
      }
      
      // Validate message format
      if (!data.characterId || !data.message) {
        const error = { error: 'Invalid message format', code: 'INVALID_FORMAT' };
        if (callback) callback(error);
        socket.emit('ERROR', error);
        return;
      }
      
      // Acknowledge receipt
      const ack = { 
        received: true, 
        messageId: data.messageId || `msg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        }
      };
      
      if (callback) callback(ack);
      
      // Echo back for testing (in real implementation, this would route to AI worker)
      socket.emit('CHARACTER_RESPONSE', {
        characterId: data.characterId,
        response: `Echo: ${data.message}`,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return { app, httpServer, io };
}

// Start server if run directly
if (require.main === module) {
  const { httpServer } = createServer();
  const PORT = process.env.PORT || 3000;
  
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
