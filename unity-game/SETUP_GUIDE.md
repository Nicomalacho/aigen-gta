# Unity WebSocket Client - Setup Guide

## Quick Setup (3 Steps)

### Step 1: Install Newtonsoft.Json

**Option A - Via Package Manager:**
1. Open Unity
2. Go to **Window → Package Manager**
3. Click **+** button → **Add package by name**
4. Enter: `com.unity.nuget.newtonsoft-json@3.2.1`
5. Click **Add**

**Option B - Via Menu:**
1. In Unity, go to **AI Agent GTA → Setup WebSocket Dependencies**
2. Click **Install Newtonsoft.Json**

### Step 2: Install WebSocketSharp

**Download & Install:**
1. Download WebSocketSharp.dll from one of these sources:
   - [GitHub Releases](https://github.com/sta/websocket-sharp/releases)
   - [NuGet Package](https://www.nuget.org/packages/WebSocketSharp/)
   - Build from source: `git clone https://github.com/sta/websocket-sharp.git`

2. Copy `WebSocketSharp.dll` to:
   ```
   unity-game/Assets/Plugins/WebSocketSharp.dll
   ```

3. In Unity, select the DLL in Project window
4. In Inspector, ensure **Select platforms for plugin** includes:
   - ☑️ Editor
   - ☑️ Standalone

### Step 3: Run Tests

**Open Test Runner:**
1. Go to **Window → General → Test Runner**
2. Or use menu: **AI Agent GTA → Run Network Tests**

**Run Tests:**
1. In Test Runner window, select **Edit Mode** tab
2. Click **Run All** button
3. Wait for tests to complete (should take ~10-20 seconds)

## Expected Test Results

All 5 tests should pass:
- ✓ Connect_ValidToken_ConnectionStateBecomesConnected
- ✓ Connect_InvalidToken_ConnectionFails
- ✓ SendMessage_ValidMessage_SendsSuccessfully
- ✓ OnMessageReceived_ValidResponse_InvokesCallback
- ✓ Disconnect_GracefullyClosesConnection

## Troubleshooting

### "WebSocketSharp not found" error
- Ensure WebSocketSharp.dll is in `Assets/Plugins/`
- Check that the DLL is not blocked (Windows: right-click → Properties → Unblock)
- Verify platform settings include your target platform

### "Newtonsoft.Json not found" error
- Open Package Manager and verify package is installed
- Try reinstalling: remove and add again
- Check Unity version compatibility (requires Unity 2022.3+)

### Tests timeout or fail
- Ensure Node.js server is running:
  ```bash
  cd api-gateway
  npm run dev
  ```
- Check that server is on correct port (3001 for tests)
- Check firewall settings

### "JWT token invalid" errors
- Tests use a mock JWT token for testing
- For real testing, generate a valid token from your auth system

## Manual Testing

Create a test script:

```csharp
using UnityEngine;

public class WebSocketTest : MonoBehaviour
{
    void Start()
    {
        // Connect
        NetworkManager.Instance.serverUrl = "ws://localhost:3000";
        NetworkManager.Instance.Connect("your-jwt-token");
        
        // Listen for events
        NetworkManager.Instance.OnConnected += () => {
            Debug.Log("Connected!");
            
            // Send a message
            var msg = new CharacterChatMessage {
                type = MessageType.CHARACTER_CHAT,
                characterId = "char-123",
                message = "Hello from Unity!"
            };
            NetworkManager.Instance.SendMessage(msg);
        };
        
        NetworkManager.Instance.OnMessageReceived += (msg) => {
            Debug.Log($"Received: {msg}");
        };
    }
}
```

Attach this to a GameObject in your scene and press Play.

## Next Steps

After tests pass:
1. Create UI for chat interface
2. Add character selection
3. Implement quest system
4. Add economy features

## Support

If tests fail:
1. Check Unity Console for errors
2. Verify server is running: `npm test` in api-gateway
3. Check network connectivity
4. Review test output in Test Runner

---

**Status:** Ready to test!
