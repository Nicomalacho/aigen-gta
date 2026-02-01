import express from 'express';
import { createServer as createHttpServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

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

export function createServer(): ServerInstance {
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
