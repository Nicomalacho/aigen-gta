# WebSocket Client Feature - TDD Implementation

## Overview

This is the first feature implementation following strict TDD principles. All tests are currently in **RED PHASE** (failing).

## Current Status

- ✅ Feature Specification Complete
- ✅ Test Stubs Created (All Failing)
- ⏳ Implementation Pending
- ⏳ Tests Passing (GREEN PHASE)
- ⏳ Refactoring

## Test Files

### Unity (C#)
**Location:** `unity-game/Assets/Scripts/Tests/Editor/NetworkManagerTests.cs`

**Tests:**
1. `Connect_ValidToken_ConnectionStateBecomesConnected` - Connection establishment
2. `Connect_InvalidToken_TriggersAuthError` - Auth failure handling
3. `SendMessage_ValidMessage_MessageQueuedAndSent` - Message sending
4. `SendMessage_WhenDisconnected_QueuesMessage` - Offline queuing
5. `OnMessageReceived_ValidJson_DeserializesAndDispatches` - Message receiving
6. `OnMessageReceived_InvalidJson_LogsError` - Error handling
7. `OnConnectionLost_AutoReconnectAttemptsWithBackoff` - Reconnection logic
8. `Heartbeat_SendsPingEvery30Seconds` - Keepalive mechanism
9. `Heartbeat_NoPongWithin10Seconds_TriggersReconnect` - Dead connection detection
10. `SendMessage_RateLimitExceeded_MessageRejected` - Rate limiting
11. `Disconnect_GracefullyClosesConnection` - Clean disconnection

### Node.js
**Location:** `api-gateway/src/__tests__/websocket.test.js`

**Tests:**
1. Connection acceptance with valid JWT
2. Connection rejection with invalid JWT
3. Connection rejection without token
4. Message routing to handlers
5. Message format validation
6. Acknowledgment responses
7. Rate limiting (100 msg/min)
8. Rate limit reset after 60s
9. Ping/pong heartbeat
10. Disconnect on unresponsive client
11. Resource cleanup on disconnect

### Integration Tests (Python)
**Location:** `ai-workers/tests/test_websocket_integration.py`

**Tests:**
1. End-to-end message echo
2. Network interruption & reconnection
3. Multiple concurrent clients
4. Rate limit persistence across reconnects
5. Per-user rate limiting
6. Token refresh flow
7. Concurrent connection handling
8. Message serialization
9. Invalid JSON handling
10. Large message rejection

## Running Tests

### Unity Tests
```bash
cd unity-game
# Open in Unity Editor
# Window → General → Test Runner
# Click "Run All"
```

### Node.js Tests
```bash
cd api-gateway
npm test
# or
npm run test:watch
```

### Python Tests
```bash
cd ai-workers
pytest tests/test_websocket_integration.py -v
# or
pytest tests/ --cov=src --cov-report=html
```

## TDD Workflow

### Phase 1: RED (Current)
All tests are written and failing. This is expected!

### Phase 2: GREEN (Next)
Write minimum code to make tests pass.

**Implementation Order:**
1. **Node.js Server Setup**
   - Create Express + Socket.io server
   - Implement JWT auth middleware
   - Setup Redis rate limiter
   - Implement connection manager

2. **Unity Client**
   - Create NetworkManager singleton
   - Implement WebSocket connection
   - Add message serialization
   - Implement reconnection logic
   - Add heartbeat mechanism

3. **Integration**
   - Test Unity ↔ Node.js communication
   - Verify rate limiting works
   - Test reconnection scenarios

### Phase 3: REFACTOR
Improve code quality while keeping tests green.

## Implementation Checklist

### Server (Node.js)
- [ ] Create `src/server.ts` with Express + Socket.io
- [ ] Create `src/middleware/auth.ts` for JWT validation
- [ ] Create `src/services/rate-limiter.ts` with Redis
- [ ] Create `src/services/connection-manager.ts`
- [ ] Create `src/handlers/message-router.ts`
- [ ] Implement heartbeat/ping-pong
- [ ] Add error handling middleware

### Client (Unity C#)
- [ ] Create `NetworkManager.cs` singleton
- [ ] Create `WebSocketClient.cs` wrapper
- [ ] Create `MessageSerializer.cs` for JSON
- [ ] Create `MessageDispatcher.cs` for routing
- [ ] Implement connection state machine
- [ ] Add automatic reconnection with backoff
- [ ] Implement heartbeat sender
- [ ] Add message queue for offline mode

### Tests
- [ ] All Unity tests passing
- [ ] All Node.js tests passing
- [ ] All integration tests passing
- [ ] Coverage > 80%

## Next Steps

1. **Start with Node.js server** - It's the foundation
2. **Run tests** - They should fail (RED)
3. **Write minimal code** - To make one test pass
4. **Repeat** - Until all tests pass (GREEN)
5. **Refactor** - Improve code quality

## Commands to Get Started

```bash
# 1. Install dependencies
npm install express socket.io jsonwebtoken ioredis
npm install --save-dev jest supertest @types/jest

# 2. Run tests (they should fail)
npm test

# 3. Start implementing (see TDD cycle below)
```

## TDD Cycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Write Test │────→│  See it Fail│────→│ Write Code  │
│   (RED)     │     │   (RED)     │     │  (GREEN)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
      ↑                                          │
      └──────────────────────────────────────────┘
              Refactor (Keep GREEN)
```

**Rule:** Write only enough code to make the test pass. No more!

## Questions?

See the feature specification: `features/001_websocket_client_spec.md`

---

**Ready to start?** Run the tests and watch them fail, then write the minimum code to make them pass!
