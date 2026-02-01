# Unity Testing - Quick Start Guide

## ⚡ Fastest Way to Run Tests (5 minutes)

### Step 1: Open Terminal and Start Server
```bash
cd /Users/nicolasgaviria/Documents/Projects/aigen-gta
./run-unity-tests.sh
```
✅ This will start the Node.js server automatically

### Step 2: Open Unity Hub

**On macOS:**
1. Press `Cmd + Space`
2. Type "Unity Hub"
3. Press Enter

**Or find it in:**
- Applications → Unity Hub
- Or Launchpad

### Step 3: Add Project

1. In Unity Hub, click **"Add"** button
2. Navigate to: `/Users/nicolasgaviria/Documents/Projects/aigen-gta/unity-game`
3. Click **"Add Project"**
4. Click on the project to open it

### Step 4: Wait for Import

Unity will import the project (this takes 1-2 minutes first time)

**You'll see:**
- Loading bar at bottom
- "Importing assets..." message
- Project window populating

### Step 5: Install Newtonsoft.Json

Once project is open:

1. **Window → Package Manager**
2. Click **+** button (top left)
3. Select **"Add package by name..."**
4. Enter exactly:
   ```
   com.unity.nuget.newtonsoft-json@3.2.1
   ```
5. Click **"Add"**
6. Wait for installation (30 seconds)

### Step 6: Add WebSocketSharp

**Option A - Use Mock (Easiest):**
1. In Project window, go to `Assets/Plugins/`
2. Select `WebSocketSharp.Mock.cs`
3. In Inspector, check **"Any Platform"**
4. Done! ✅

**Option B - Real DLL (Better):**
1. Download from: https://github.com/sta/websocket-sharp/releases
2. Copy `WebSocketSharp.dll` to `Assets/Plugins/`
3. In Unity, select the DLL
4. In Inspector, check **"Editor"** and **"Standalone"**

### Step 7: Open Test Runner

1. **Window → General → Test Runner**
2. Click **"Edit Mode"** tab
3. You should see 5 tests listed:
   - Connect_ValidToken_ConnectionStateBecomesConnected
   - Connect_InvalidToken_ConnectionFails
   - SendMessage_ValidMessage_SendsSuccessfully
   - OnMessageReceived_ValidResponse_InvokesCallback
   - Disconnect_GracefullyClosesConnection

### Step 8: Run Tests! 🎉

1. Click **"Run All"** button
2. Wait 10-20 seconds
3. All tests should show **GREEN** ✅

---

## 🎯 Expected Results

```
Test Runner
├── Tests (5)
│   ├── ✓ Connect_ValidToken... (1.2s)
│   ├── ✓ Connect_InvalidToken... (0.8s)
│   ├── ✓ SendMessage... (0.5s)
│   ├── ✓ OnMessageReceived... (0.6s)
│   └── ✓ Disconnect... (0.3s)
└── Test Summary: 5 passed, 0 failed
```

---

## 🔧 Troubleshooting

### "Newtonsoft.Json not found"
- Reinstall via Package Manager
- Or use menu: **AI Agent GTA → Setup WebSocket Dependencies**

### "WebSocketSharp not found"
- Check that DLL is in `Assets/Plugins/`
- Verify platform settings in Inspector
- Try using the Mock version instead

### Tests timeout or fail
- Check server is running: `curl http://localhost:3000/health`
- Restart server: `kill 62701 && cd api-gateway && npm run dev`
- Check Console for errors (Window → General → Console)

### "Cannot connect to server"
- Verify server URL: `ws://localhost:3000`
- Check firewall settings
- Try: `telnet localhost 3000`

---

## 🎮 Manual Testing

After unit tests pass, try the test scene:

1. Open scene: **Assets/Scenes/WebSocketTest.unity**
2. In Hierarchy, select **NetworkManager** GameObject
3. In Inspector, enter a JWT token
4. Press **Play** button (▶️) at top center
5. Watch Console for connection messages

---

## 📊 What Tests Verify

1. **Connection Test** - Can connect with valid JWT
2. **Auth Failure Test** - Rejects invalid tokens
3. **Send Test** - Can send messages to server
4. **Receive Test** - Can receive responses from server
5. **Disconnect Test** - Clean disconnection works

---

## ✅ Success Checklist

- [ ] Server running on port 3000
- [ ] Unity project imported
- [ ] Newtonsoft.Json installed
- [ ] WebSocketSharp added
- [ ] 5/5 tests passing
- [ ] No errors in Console

**All checked?** You're ready to build the game! 🚀

---

## 🆘 Need Help?

**Server issues:**
```bash
cd api-gateway
npm test  # Should show 13 passing tests
```

**Unity issues:**
- Check Console: Window → General → Console
- Reimport assets: Right-click in Project → Reimport All
- Restart Unity

**Still stuck?** Check `SETUP_GUIDE.md` for detailed troubleshooting
