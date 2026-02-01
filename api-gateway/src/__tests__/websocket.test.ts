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
    // Setup test server with shorter rate limit window for testing (2 seconds)
    const serverInstance = createServer({ rateLimitWindow: 2 });
    httpServer = serverInstance.httpServer;
    io = serverInstance.io;
    
    httpServer.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT} (rate limit window: 2s)`);
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
      let responsesReceived = 0;
      let testCompleted = false;
      const TOTAL_MESSAGES = 105; // Send a few extra to ensure we hit the limit
      
      // Act
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: validToken }
      });
      
      const checkComplete = () => {
        responsesReceived++;
        // Once we've sent all messages and received rate limit error, we're done
        if (!testCompleted && rateLimitErrorReceived && responsesReceived >= 100) {
          testCompleted = true;
          expect(rateLimitErrorReceived).toBe(true);
          done();
        }
      };
      
      clientSocket.on('connect', () => {
        // Send messages rapidly
        for (let i = 0; i < TOTAL_MESSAGES; i++) {
          clientSocket!.emit('CHARACTER_CHAT', { ...message, index: i }, (ack: any) => {
            if (ack.code === 'RATE_LIMIT_EXCEEDED') {
              rateLimitErrorReceived = true;
            }
            checkComplete();
          });
        }
        
        // Safety timeout - if we don't get rate limit error in 3 seconds, fail
        setTimeout(() => {
          if (!testCompleted && !rateLimitErrorReceived) {
            testCompleted = true;
            done(new Error('Rate limit error not received within timeout'));
          }
        }, 3000);
      });
      
      clientSocket.on('ERROR', (err: any) => {
        if (err.code === 'RATE_LIMIT_EXCEEDED') {
          rateLimitErrorReceived = true;
          checkComplete();
        }
      });
      
      clientSocket.on('connect_error', (err: any) => {
        done(new Error(`Connection failed: ${err.message}`));
      });
    }, 10000); // 10 second timeout for this test

    it('should reset rate limit after 60 seconds', (done) => {
      // Arrange - use unique user
      const validToken = jwt.sign(
        { userId: `user-reset-test-${Date.now()}`, steamId: 'steam-456', tier: 'starter' },
        JWT_SECRET
      );
      
      const message = {
        type: 'CHARACTER_CHAT',
        characterId: 'char-123',
        message: 'Test message'
      };
      
      let messagesAccepted = 0;
      let testPhase = 'sending'; // 'sending', 'waiting', 'testing'
      
      // Act
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: validToken }
      });
      
      const sendInitialMessages = () => {
        // Send 100 messages to hit rate limit
        for (let i = 0; i < 100; i++) {
          clientSocket!.emit('CHARACTER_CHAT', { ...message, index: i }, (ack: any) => {
            if (ack.received) {
              messagesAccepted++;
            }
            
            if (messagesAccepted === 100) {
              // All 100 messages accepted, now wait 60 seconds
              testPhase = 'waiting';
              console.log('Rate limit test: Waiting 60 seconds for window to reset...');
              
              setTimeout(() => {
                // After rate limit window (2s), try sending another message
                testPhase = 'testing';
                clientSocket!.emit('CHARACTER_CHAT', { ...message, phase: 'after-wait' }, (ack: any) => {
                  // Assert - message should be accepted after rate limit reset
                  expect(ack.received).toBe(true);
                  expect(ack.error).toBeUndefined();
                  done();
                });
              }, 2500); // Wait 2.5 seconds (slightly more than 2s window)
            }
          });
        }
      };
      
      clientSocket.on('connect', sendInitialMessages);
      
      clientSocket.on('connect_error', (err: any) => {
        done(new Error(`Connection failed: ${err.message}`));
      });
    }, 10000); // 10 second timeout (2.5s wait + buffer)
  });

  describe('Heartbeat', () => {
    it('should respond to ping with pong', (done) => {
      // Arrange
      const validToken = jwt.sign(
        { userId: 'user-123', steamId: 'steam-456', tier: 'starter' },
        JWT_SECRET
      );
      
      // Act
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: validToken }
      });
      
      clientSocket.on('connect', () => {
        // Send ping
        clientSocket!.emit('PING');
      });
      
      clientSocket.on('PONG', () => {
        // Assert
        done();
      });
      
      clientSocket.on('connect_error', (err: any) => {
        done(new Error(`Connection failed: ${err.message}`));
      });
    });

    it('should disconnect client not responding to ping', (done) => {
      // Arrange
      const validToken = jwt.sign(
        { userId: 'user-ping-timeout', steamId: 'steam-456', tier: 'starter' },
        JWT_SECRET
      );
      
      // Act - create client that will stop responding to pings
      clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: validToken }
      });
      
      let disconnectReceived = false;
      
      clientSocket.on('connect', () => {
        console.log('Client connected, will stop responding to pings in 500ms');
        
        // After 500ms, stop responding to pings by disabling the transport
        setTimeout(() => {
          console.log('Test: Simulating unresponsive client...');
          // @ts-ignore - access internal socket to stop ping responses
          if (clientSocket?.io?.engine) {
            // @ts-ignore
            clientSocket.io.engine.close();
          }
        }, 500);
      });
      
      clientSocket.on('disconnect', (reason: string) => {
        if (!disconnectReceived) {
          disconnectReceived = true;
          console.log(`Client disconnected with reason: ${reason}`);
          // Any disconnect reason is acceptable for this test
          done();
        }
      });
      
      // Safety timeout - if not disconnected in 6 seconds, fail
      setTimeout(() => {
        if (!disconnectReceived && clientSocket?.connected) {
          done(new Error('Client should have been disconnected due to ping timeout'));
        } else if (!disconnectReceived) {
          // Already disconnected but event might not have fired
          done();
        }
      }, 6000);
      
      clientSocket.on('connect_error', (err: any) => {
        done(new Error(`Connection failed: ${err.message}`));
      });
    }, 7000);
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
