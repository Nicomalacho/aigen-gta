#!/bin/bash

# Unity WebSocket Test Runner
# This script helps prepare the environment for Unity testing

echo "=========================================="
echo "Unity WebSocket Test Preparation Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js server is running
echo "Step 1: Checking Node.js server..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running on port 3001${NC}"
else
    echo -e "${YELLOW}⚠ Server is NOT running on port 3001${NC}"
    echo "  To start the server, run:"
    echo "  cd api-gateway && npm run dev"
    echo ""
    echo -e "${YELLOW}Starting server automatically...${NC}"
    cd api-gateway && npm run dev &
    SERVER_PID=$!
    sleep 3
    echo -e "${GREEN}✓ Server started (PID: $SERVER_PID)${NC}"
fi

echo ""
echo "Step 2: Checking Unity project structure..."

# Check if required directories exist
if [ -d "unity-game/Assets/Scripts/Core" ]; then
    echo -e "${GREEN}✓ Core scripts directory exists${NC}"
else
    echo -e "${RED}✗ Core scripts directory missing${NC}"
fi

if [ -d "unity-game/Assets/Scripts/Tests/Editor" ]; then
    echo -e "${GREEN}✓ Test scripts directory exists${NC}"
else
    echo -e "${RED}✗ Test scripts directory missing${NC}"
fi

if [ -d "unity-game/Assets/Plugins" ]; then
    echo -e "${GREEN}✓ Plugins directory exists${NC}"
    
    # Check for WebSocketSharp
    if [ -f "unity-game/Assets/Plugins/WebSocketSharp.dll" ]; then
        echo -e "${GREEN}✓ WebSocketSharp.dll found${NC}"
    else
        echo -e "${RED}✗ WebSocketSharp.dll NOT found${NC}"
        echo "  Download from: https://github.com/sta/websocket-sharp"
        echo "  Place in: unity-game/Assets/Plugins/"
    fi
else
    echo -e "${YELLOW}⚠ Plugins directory missing - creating...${NC}"
    mkdir -p unity-game/Assets/Plugins
    echo -e "${YELLOW}  Please add WebSocketSharp.dll to this directory${NC}"
fi

echo ""
echo "Step 3: Checking Node.js dependencies..."
cd api-gateway
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Node.js dependencies missing - installing...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi
cd ..

echo ""
echo "=========================================="
echo "Test Preparation Complete!"
echo "=========================================="
echo ""
echo "Next steps to run tests in Unity:"
echo ""
echo "1. Open Unity Hub"
echo "2. Add project: $(pwd)/unity-game"
echo "3. Open project with Unity 2022.3 LTS or newer"
echo "4. Wait for project to import"
echo "5. Install Newtonsoft.Json:"
echo "   Window → Package Manager → + → Add by name"
echo "   Name: com.unity.nuget.newtonsoft-json@3.2.1"
echo "6. Add WebSocketSharp.dll to Assets/Plugins/"
echo "7. Open Test Runner: Window → General → Test Runner"
echo "8. Click 'Run All' in Edit Mode tab"
echo ""
echo "Expected: All 5 tests should pass in ~10-20 seconds"
echo ""
echo "For manual testing:"
echo "- Use the WebSocketTestUI component"
echo "- Or run: AI Agent GTA → Run Network Tests"
echo ""

# Keep server running if we started it
if [ ! -z "$SERVER_PID" ]; then
    echo "Server is running in background (PID: $SERVER_PID)"
    echo "To stop server: kill $SERVER_PID"
fi
