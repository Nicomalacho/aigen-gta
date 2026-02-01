import ioClient from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { createServer } from '../server';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Socket } from 'socket.io-client';

const JWT_SECRET = 'test-secret-key';
const TEST_PORT = 3001;

describe('WebSocket Server', () => {
  let httpServer: HttpServer;
  let io: SocketIOServer;
  let clientSocket: Socket | null;
  let server: any;

  beforeAll((done) => {
    // Setup test server
    const serverInstance = createServer();
    httpServer = serverInstance.httpServer;
    io = serverInstance.io;
    
    httpServer.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}`);
      done();
    });
  });

  afterAll((done) => {
    // Cleanup
    if (clientSocket) {
      clientSocket.close();
    }
    io.close();
    httpServer.close(done);
  });

  beforeEach(() => {
    // Reset state between tests
    if (clientSocket) {
      clientSocket.close();
      clientSocket = null;
    }
  });

  describe('Connection', () => {
    it('should accept connection with valid JWT', (done) => {
      // Arrange
      const validToken = jwt.sign(
        { userId: 'user-123', steamId: 'steam-456', tier: 'starter' },
        JWT_SECRET
      );
      
      // Act
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: validToken }
      });
      
      // Assert
      clientSocket.on('connect', () => {
        expect(clientSocket!.connected).toBe(true);
      });
      
      clientSocket.on('AUTH_SUCCESS', (data: any) => {
        expect(data.userId).toBe('user-123');
        expect(data.connected).toBe(true);
        done();
      });
      
      clientSocket.on('connect_error', (err: any) => {
        done.fail(`Connection failed: ${err.message}`);
      });
    });

    it('should reject connection with invalid JWT', (done) => {
      // Arrange
      const invalidToken = 'invalid_token';
      
      // Act
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: invalidToken }
      });
      
      // Assert
      clientSocket.on('connect', () => {
        done.fail('Should not connect with invalid token');
      });
      
      clientSocket.on('connect_error', (err: any) => {
        expect(err.message).toContain('Authentication failed');
        expect(clientSocket!.connected).toBe(false);
        done();
      });
    });

    it('should reject connection without token', (done) => {
      // Act - connect without providing a token
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`);
      
      // Assert
      clientSocket.on('connect', () => {
        done.fail('Should not connect without token');
      });
      
      clientSocket.on('connect_error', (err: any) => {
        expect(err.message).toContain('Authentication required');
        expect(clientSocket!.connected).toBe(false);
        done();
      });
    });
  });

  describe('Message Handling', () => {
    it('should route CHARACTER_CHAT messages to handler', (done) => {
      // Arrange
      const validToken = jwt.sign(
        { userId: 'user-123', steamId: 'steam-456', tier: 'starter' },
        JWT_SECRET
      );
      
      const message = {
        type: 'CHARACTER_CHAT',
        characterId: 'char-123',
        message: 'Hello!'
      };
      
      // Act
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: validToken }
      });
      
      clientSocket.on('connect', () => {
        clientSocket!.emit('CHARACTER_CHAT', message, (ack: any) => {
          // Assert
          expect(ack.received).toBe(true);
          expect(ack.messageId).toBeDefined();
          done();
        });
      });
      
      clientSocket.on('connect_error', (err: any) => {
        done.fail(`Connection failed: ${err.message}`);
      });
    });

    it('should validate message format before routing', (done) => {
      // Arrange
      const validToken = jwt.sign(
        { userId: 'user-123', steamId: 'steam-456', tier: 'starter' },
        JWT_SECRET
      );
      
      const invalidMessage = {
        // Missing required fields (no characterId, no message)
        type: 'CHARACTER_CHAT'
      };
      
      // Act
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: validToken }
      });
      
      clientSocket.on('connect', () => {
        clientSocket!.emit('CHARACTER_CHAT', invalidMessage, (ack: any) => {
          // Assert - should receive error in acknowledgment
          expect(ack.error).toBe('Invalid message format');
          expect(ack.code).toBe('INVALID_FORMAT');
        });
      });
      
      clientSocket.on('ERROR', (err: any) => {
        expect(err.error).toBe('Invalid message format');
        expect(err.code).toBe('INVALID_FORMAT');
        done();
      });
      
      clientSocket.on('connect_error', (err: any) => {
        done.fail(`Connection failed: ${err.message}`);
      });
    });

    it('should send acknowledgment for received messages', (done) => {
      // Arrange
      const validToken = jwt.sign(
        { userId: 'user-123', steamId: 'steam-456', tier: 'starter' },
        JWT_SECRET
      );
      
      const message = {
        type: 'CHARACTER_CHAT',
        characterId: 'char-123',
        message: 'Hello!',
        messageId: 'msg-123'
      };
      
      // Act
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: validToken }
      });
      
      clientSocket.on('connect', () => {
        clientSocket!.emit('CHARACTER_CHAT', message, (ack: any) => {
          // Assert
          expect(ack.received).toBe(true);
          expect(ack.messageId).toBe('msg-123');
          expect(ack.timestamp).toBeDefined();
          done();
        });
      });
      
      clientSocket.on('connect_error', (err: any) => {
        done.fail(`Connection failed: ${err.message}`);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should track rate limit in acknowledgment', (done) => {
      // Arrange
      const validToken = jwt.sign(
        { userId: 'user-123', steamId: 'steam-456', tier: 'starter' },
        JWT_SECRET
      );
      
      const message = {
        type: 'CHARACTER_CHAT',
        characterId: 'char-123',
        message: 'Test message'
      };
      
      // Act
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: validToken }
      });
      
      clientSocket.on('connect', () => {
        clientSocket!.emit('CHARACTER_CHAT', message, (ack: any) => {
          // Assert
          expect(ack.received).toBe(true);
          expect(ack.rateLimit).toBeDefined();
          expect(ack.rateLimit.remaining).toBeLessThan(100);
          expect(ack.rateLimit.resetTime).toBeDefined();
          done();
        });
      });
      
      clientSocket.on('connect_error', (err: any) => {
        done.fail(`Connection failed: ${err.message}`);
      });
    });

    it('should reject messages beyond rate limit', (done) => {
      // Arrange - use a unique user to ensure fresh rate limit window
      const validToken = jwt.sign(
        { userId: `user-rate-limit-${Date.now()}`, steamId: 'steam-456', tier: 'starter' },
        JWT_SECRET
      );
      
      const message = {
        type: 'CHARACTER_CHAT',
        characterId: 'char-123',
        message: 'Test message'
      };
      
      let rateLimitErrorReceived = false;
      let messagesSent = 0;
      const MAX_MESSAGES = 101;
      
      // Act
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: validToken }
      });
      
      const sendMessages = () => {
        for (let i = 0; i < MAX_MESSAGES; i++) {
          clientSocket!.emit('CHARACTER_CHAT', { ...message, index: i }, (ack: any) => {
            messagesSent++;
            
            if (ack.error === 'RATE_LIMIT_EXCEEDED') {
              rateLimitErrorReceived = true;
            }
            
            if (messagesSent === MAX_MESSAGES) {
              // Assert
              expect(rateLimitErrorReceived).toBe(true);
              done();
            }
          });
        }
      };
      
      clientSocket.on('connect', sendMessages);
      
      clientSocket.on('ERROR', (err: any) => {
        if (err.error === 'RATE_LIMIT_EXCEEDED') {
          rateLimitErrorReceived = true;
        }
      });
      
      clientSocket.on('connect_error', (err: any) => {
        done.fail(`Connection failed: ${err.message}`);
      });
    });

    it('should reset rate limit after 60 seconds', async () => {
      // Arrange
      // Send 100 messages
      // Wait 60 seconds
      
      // Act
      // Try to send another message
      
      // Assert
      expect(true).toBe(false); // Force fail - RED PHASE
      // Message should be accepted
    });
  });

  describe('Heartbeat', () => {
    it('should respond to ping with pong', async () => {
      // Arrange
      let pongReceived = false;
      
      // Act
      // await connectWithValidToken();
      // clientSocket.emit('PING');
      // clientSocket.on('PONG', () => pongReceived = true);
      // await waitFor(100);
      
      // Assert
      expect(true).toBe(false); // Force fail - RED PHASE
      // expect(pongReceived).toBe(true);
    });

    it('should disconnect client not responding to ping', async () => {
      // Arrange
      // Connect client
      // Disable client's ping response
      
      // Act
      // Wait for server ping interval (30s) + timeout (10s)
      
      // Assert
      expect(true).toBe(false); // Force fail - RED PHASE
      // expect(clientSocket.connected).toBe(false);
    });
  });

  describe('Disconnection', () => {
    it('should cleanup resources on disconnect', async () => {
      // Arrange
      // Connect client
      
      // Act
      // clientSocket.disconnect();
      // await waitFor(100);
      
      // Assert
      expect(true).toBe(false); // Force fail - RED PHASE
      // expect(connectionManager.getConnectionCount()).toBe(0);
      // expect(rateLimiter.cleanup).toHaveBeenCalled();
    });

    it('should handle unexpected client disconnect', async () => {
      // Arrange
      // Connect client
      
      // Act
      // Simulate network failure (don't call disconnect)
      // clientSocket.io.engine.close();
      // await waitFor(100);
      
      // Assert
      expect(true).toBe(false); // Force fail - RED PHASE
      // Server should detect disconnect and cleanup
    });
  });
});

// Helper functions
async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectWithValidToken() {
  // TODO: Implement
}
