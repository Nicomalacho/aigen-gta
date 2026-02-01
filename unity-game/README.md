# Unity WebSocket Client

## Overview

Unity C# client for connecting to the AI Agent GTA Node.js backend via WebSocket.

## Features

- ✅ WebSocket connection with JWT authentication
- ✅ Automatic reconnection with exponential backoff
- ✅ Message queue for offline mode
- ✅ JSON serialization with Newtonsoft.Json
- ✅ Event-based architecture
- ✅ Connection state management
- ✅ Ping/pong heartbeat support

## Architecture

```
NetworkManager (Singleton)
├── WebSocket (WebSocketSharp)
├── Connection State Machine
├── Message Queue
└── Event System
```

## Usage

### Basic Connection

```csharp
// Connect to server
NetworkManager.Instance.serverUrl = "ws://localhost:3000";
NetworkManager.Instance.Connect("your-jwt-token");

// Listen for connection events
NetworkManager.Instance.OnConnected += () => {
    Debug.Log("Connected!");
};

NetworkManager.Instance.OnConnectionStateChanged += (state) => {
    Debug.Log($"State: {state}");
};
```

### Sending Messages

```csharp
var message = new CharacterChatMessage
{
    type = MessageType.CHARACTER_CHAT,
    characterId = "char-123",
    message = "Hello AI!"
};

NetworkManager.Instance.SendMessage(message, (success) => {
    if (success) {
        Debug.Log("Message sent!");
    }
});
```

### Receiving Messages

```csharp
NetworkManager.Instance.OnMessageReceived += (message) => {
    if (message is CharacterResponseMessage response)
    {
        Debug.Log($"AI: {response.response}");
    }
};
```

## Connection States

- `Disconnected` - Not connected
- `Connecting` - Attempting to connect
- `Connected` - Successfully connected
- `Reconnecting` - Attempting to reconnect after disconnect
- `Error` - Connection error occurred

## Testing

### Running Tests in Unity

1. Open Unity Editor
2. Go to **Window → General → Test Runner**
3. Click **Run All** or select specific tests

### Test Coverage

- Connection with valid JWT
- Connection failure with invalid JWT
- Message sending
- Message receiving
- Graceful disconnection

## Dependencies

- **WebSocketSharp** - WebSocket client library
- **Newtonsoft.Json** - JSON serialization
- **Unity Test Framework** - Unit testing

## Configuration

```csharp
// Inspector settings
serverUrl = "ws://localhost:3000"  // Server URL
reconnectDelay = 5f               // Seconds between reconnection attempts
maxReconnectAttempts = 5          // Max reconnection attempts
```

## Next Steps

1. Import WebSocketSharp DLL to Unity project
2. Configure Newtonsoft.Json for Unity
3. Run tests in Unity Test Runner
4. Integrate with game UI
5. Add more message types (inventory, quests, etc.)

## Integration with Node.js Server

This client connects to the Node.js API Gateway at `ws://localhost:3000` (or your configured URL).

Make sure the server is running:
```bash
cd api-gateway
npm run dev
```

---

**Status:** Implementation complete, ready for Unity integration
