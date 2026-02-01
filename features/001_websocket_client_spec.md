# Feature Specification: WebSocket Client

## Overview

Establish real-time bidirectional communication between Unity game client and Node.js backend API using WebSocket protocol. This is the foundational feature that enables all real-time game functionality including AI character interactions, world updates, and multiplayer features.

**Priority:** Critical (P0)  
**Complexity:** Medium  
**Estimated Hours:** 16 hours  
**Sprint:** Sprint 1

---

## Acceptance Criteria

- [ ] Unity client can establish WebSocket connection to backend
- [ ] Connection authenticates using JWT token
- [ ] Bidirectional message sending works (Unity ↔ Backend)
- [ ] Automatic reconnection on connection loss
- [ ] Heartbeat/ping-pong keeps connection alive
- [ ] Connection state is trackable (Connected, Connecting, Disconnected, Error)
- [ ] Rate limiting enforced (100 messages/minute per user)
- [ ] Messages are serialized/deserialized correctly (JSON)
- [ ] Connection gracefully closes on application quit
- [ ] Error handling for network failures, timeouts, auth failures

---

## Technical Requirements

### Unity Client (C#)
- **Library:** WebSocketSharp (or UnityWebSocket)
- **Protocol:** WSS (WebSocket Secure)
- **Serialization:** Newtonsoft.Json
- **Threading:** Main thread message dispatch

### Node.js Backend
- **Library:** Socket.io with WebSocket transport
- **Framework:** Express.js
- **Authentication:** JWT validation middleware
- **Rate Limiting:** Redis-based sliding window

### Infrastructure
- **Port:** 3000 (dev), 443 (prod via ALB)
- **SSL/TLS:** Required for production
- **Heartbeat Interval:** 30 seconds
- **Reconnection Strategy:** Exponential backoff (max 5 retries)

---

## Test Cases

### Unit Tests (Unity C#)

#### Test 1: Connection Establishment
**Test:** `Connect_ValidToken_ConnectionStateBecomesConnected`
- **Input:** Valid JWT token, correct server URL
- **Expected Output:** ConnectionState changes to `Connected`, OnOpen event fired
- **Edge Cases:** 
  - Invalid token should trigger auth error
  - Wrong URL should trigger connection error

#### Test 2: Message Sending
**Test:** `SendMessage_ValidMessage_MessageQueuedAndSent`
- **Input:** TestMessage { type: "TEST", data: "hello" }
- **Expected Output:** Message serialized to JSON and sent via WebSocket
- **Edge Cases:**
  - Sending when disconnected should queue message
  - Large messages (>1MB) should be rejected

#### Test 3: Message Receiving
**Test:** `OnMessageReceived_ValidJson_DeserializesAndDispatches`
- **Input:** JSON string: `{"type":"TEST","data":"world"}`
- **Expected Output:** Message deserialized, event raised with correct type
- **Edge Cases:**
  - Invalid JSON should log error, not crash
  - Unknown message type should be logged but ignored

#### Test 4: Reconnection Logic
**Test:** `OnConnectionLost_AutoReconnectAttemptsWithBackoff`
- **Input:** Force disconnect after 5 seconds
- **Expected Output:** 
  - State changes to `Reconnecting`
  - Retries up to 5 times with exponential delay (1s, 2s, 4s, 8s, 16s)
  - After max retries, state becomes `Disconnected`
- **Edge Cases:**
  - Successful reconnect should reset retry count
  - Manual disconnect should not trigger auto-reconnect

#### Test 5: Heartbeat Mechanism
**Test:** `Heartbeat_SendsPingEvery30Seconds`
- **Input:** Connection established, wait 35 seconds
- **Expected Output:** At least 1 ping message sent, pong received
- **Edge Cases:**
  - No pong within 10 seconds should trigger reconnect
  - Heartbeat should stop when disconnected

#### Test 6: Rate Limiting
**Test:** `SendMessage_RateLimitExceeded_MessageRejected`
- **Input:** Send 101 messages within 60 seconds
- **Expected Output:** 
  - First 100 messages sent successfully
  - 101st message rejected with RateLimitExceeded error
  - Error event raised
- **Edge Cases:**
  - Rate limit should reset after 60 seconds
  - Different message types should share same limit

### Unit Tests (Node.js)

#### Test 1: Connection Handler
**Test:** `should accept connection with valid JWT`
- **Input:** Socket connection with valid token in auth header
- **Expected Output:** 
  - Connection accepted
  - User data attached to socket
  - Rate limiter initialized for user

#### Test 2: Authentication Failure
**Test:** `should reject connection with invalid JWT`
- **Input:** Socket connection with expired/invalid token
- **Expected Output:** 
  - Connection rejected with 401
  - Error message: "Authentication failed"

#### Test 3: Message Routing
**Test:** `should route messages to appropriate handlers`
- **Input:** Message { type: "CHARACTER_CHAT", characterId: "123", message: "hi" }
- **Expected Output:** 
  - Message validated against schema
  - Routed to character handler
  - Acknowledgment sent back

#### Test 4: Rate Limiting
**Test:** `should enforce rate limits per user`
- **Input:** 101 messages from same user within 60s
- **Expected Output:** 
  - 101st message receives error event
  - Rate limit headers included

### Integration Tests

#### Test 1: End-to-End Message Flow
**Test:** `UnityToBackend_MessageEchoedBack`
- **Setup:** 
  - Start backend server
  - Connect Unity client
- **Action:** 
  - Unity sends: { type: "ECHO", data: "test123" }
- **Expected:** 
  - Backend receives and validates message
  - Backend echoes back same message
  - Unity receives within 100ms

#### Test 2: Connection Resilience
**Test:** `NetworkInterruption_AutoReconnectsAndResumes`
- **Setup:** 
  - Active connection with 5 messages queued
- **Action:** 
  - Drop network for 10 seconds
  - Restore network
- **Expected:** 
  - Client detects disconnect
  - Auto-reconnects within 5 seconds
  - Queued messages sent after reconnect
  - No message loss

#### Test 3: Multiple Clients
**Test:** `MultipleClients_CanConnectSimultaneously`
- **Setup:** 
  - Backend running
- **Action:** 
  - Connect 10 Unity clients simultaneously
  - Each sends 10 messages
- **Expected:** 
  - All connections established
  - All messages received by backend
  - No cross-contamination between clients

### E2E Tests

#### Test 1: Full Login Flow
**Test:** `PlayerLoginToFirstMessage_CompleteJourney`
- **Given:** 
  - Game is installed
  - Player has valid Steam account
- **When:** 
  - Player launches game
  - Logs in via Steam
  - Enters game world
  - Sends first chat message to NPC
- **Then:** 
  - WebSocket connects within 2 seconds
  - Authentication succeeds
  - Message delivered to backend
  - AI response received within 3 seconds

#### Test 2: Reconnection During Gameplay
**Test:** `NetworkDropDuringConversation_ResumesSeamlessly`
- **Given:** 
  - Player is in active conversation with AI character
  - 3 messages exchanged
- **When:** 
  - Network drops for 15 seconds
  - Network restored
- **Then:** 
  - Game shows "Reconnecting..." indicator
  - Connection restored automatically
  - Conversation context preserved
  - Player can continue chatting

---

## Error Scenarios

### Network Errors
| Error | Cause | Handling |
|-------|-------|----------|
| `CONNECTION_TIMEOUT` | Server not responding | Retry with backoff, show "Server unavailable" |
| `DNS_RESOLUTION_FAILED` | Invalid server URL | Log error, show "Invalid server address" |
| `SSL_HANDSHAKE_FAILED` | Certificate issue | Log error, show "Secure connection failed" |
| `RATE_LIMIT_EXCEEDED` | Too many messages | Queue message, retry after 60s, notify user |

### Authentication Errors
| Error | Cause | Handling |
|-------|-------|----------|
| `AUTH_TOKEN_EXPIRED` | JWT expired | Refresh token, reconnect |
| `AUTH_TOKEN_INVALID` | Bad signature | Show login screen |
| `AUTH_USER_BANNED` | User suspended | Show "Account suspended" message |

### Protocol Errors
| Error | Cause | Handling |
|-------|-------|----------|
| `INVALID_MESSAGE_FORMAT` | Malformed JSON | Log error, skip message |
| `UNKNOWN_MESSAGE_TYPE` | Unrecognized type | Log warning, send error response |
| `MESSAGE_TOO_LARGE` | >1MB payload | Reject with error, log attempt |

---

## Dependencies

### Required Before Implementation
- [ ] Node.js project scaffold (Express + Socket.io)
- [ ] Unity project with WebSocketSharp imported
- [ ] JWT authentication library (both sides)
- [ ] Redis instance for rate limiting
- [ ] Test frameworks configured (NUnit, Jest)

### Blockers
- None (this is foundational)

### Dependent Features
- All AI character interactions
- Real-time world updates
- Multiplayer features
- Economy transactions

---

## Implementation Notes

### Unity Architecture
```csharp
// Core classes to implement:
- NetworkManager (Singleton, connection lifecycle)
- WebSocketClient (WebSocketSharp wrapper)
- MessageSerializer (JSON serialization)
- MessageDispatcher (Route messages to handlers)
- ConnectionState (Enum: Disconnected, Connecting, Connected, Reconnecting, Error)
```

### Node.js Architecture
```typescript
// Core modules to implement:
- socket-server.ts (Socket.io setup)
- auth-middleware.ts (JWT validation)
- rate-limiter.ts (Redis sliding window)
- message-router.ts (Route to handlers)
- connection-manager.ts (Track active connections)
```

### Message Protocol
```typescript
interface BaseMessage {
  type: MessageType;
  timestamp: number;
  messageId: string;
  sessionId: string;
}

enum MessageType {
  // Client → Server
  AUTH = 'AUTH',
  PING = 'PING',
  CHARACTER_CHAT = 'CHARACTER_CHAT',
  
  // Server → Client
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  AUTH_FAILURE = 'AUTH_FAILURE',
  PONG = 'PONG',
  ERROR = 'ERROR',
  CHARACTER_RESPONSE = 'CHARACTER_RESPONSE'
}
```

---

## Testing Checklist

### Pre-Implementation
- [ ] All unit test stubs created (failing)
- [ ] Integration test environment configured
- [ ] Mock servers/clients implemented

### During Implementation
- [ ] Unit tests passing (Unity)
- [ ] Unit tests passing (Node.js)
- [ ] Integration tests passing
- [ ] Coverage > 80%

### Post-Implementation
- [ ] E2E test passing
- [ ] Load test (100 concurrent connections)
- [ ] Security review
- [ ] Documentation updated
- [ ] Code review approved

---

## Questions & Decisions

1. **Q:** Should we use Socket.io rooms for world isolation?  
   **A:** Yes, each world gets its own room

2. **Q:** Binary or text protocol for large payloads?  
   **A:** Start with JSON text, add binary compression later if needed

3. **Q:** Client-side message queue size limit?  
   **A:** 100 messages, drop oldest with warning

4. **Q:** Should we support multiple concurrent connections per user?  
   **A:** No, one connection per user (kick existing on new login)

---

**Status:** Ready for Implementation  
**Assigned To:** TBD  
**Created:** 2026-01-31  
**Last Updated:** 2026-01-31
