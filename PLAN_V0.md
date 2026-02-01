# AI Agent Open World Game - Technical Architecture Plan (V0)

## Executive Summary

[↑ Back to Top](#table-of-contents)

A real-time open-world simulation where every NPC is powered by DSPy LLM agents with persistent memory, orchestrated by a Narrative Director AI that generates quests and world events. Built with Unity frontend, Node.js API gateway, Temporal workflows, and Python AI workers.

**Target:** Steam-deployable game with $50-200 subscription tiers supporting 3-50 AI agents per user.

---

## Table of Contents

[↑ Back to Top](#table-of-contents)

- [Executive Summary](#executive-summary)
- [System Architecture](#system-architecture)
- [Phase 1: Core Infrastructure (Weeks 1-3)](#phase-1-core-infrastructure-weeks-1-3)
  - [1.1 Project Structure Setup](#11-project-structure-setup)
  - [1.2 Communication Protocol](#12-communication-protocol)
  - [1.3 Node.js API Gateway](#13-nodejs-api-gateway)
  - [1.4 Database Schema](#14-database-schema)
- [Phase 2: AI Agent System (Weeks 4-6)](#phase-2-ai-agent-system-weeks-4-6)
  - [2.1 DSPy Character Agent Architecture](#21-dspy-character-agent-architecture)
  - [2.2 Memory Management System](#22-memory-management-system)
  - [2.3 Narrative Director Agent](#23-narrative-director-agent)
- [Phase 3: Temporal Workflow Orchestration](#phase-3-temporal-workflow-orchestration)
  - [3.1 Workflow Definitions](#31-workflow-definitions)
  - [3.2 Activity Implementations](#32-activity-implementations)
- [Phase 4: Unity Game Implementation](#phase-4-unity-game-implementation)
  - [4.1 Core Systems](#41-core-systems)
  - [4.2 UI Systems](#42-ui-systems)
- [Phase 5: Economy & Subscription System](#phase-5-economy--subscription-system)
  - [5.1 Subscription Management](#51-subscription-management)
  - [5.2 Economy Service](#52-economy-service)
- [Phase 6: Deployment & Scaling](#phase-6-deployment--scaling)
  - [6.1 Docker Configuration](#61-docker-configuration)
  - [6.2 Kubernetes Configuration](#62-kubernetes-configuration)
  - [6.3 Steam Integration](#63-steam-integration)
- [Cost Analysis & Optimization](#cost-analysis--optimization)
  - [LLM Cost Estimates](#llm-cost-estimates)
  - [Infrastructure Cost Estimates](#infrastructure-cost-estimates)
  - [Complete Cost Analysis](#complete-cost-analysis-llm--infrastructure)
  - [Break-Even Analysis](#break-even-analysis)
  - [Cost Optimization Strategies](#cost-optimization-strategies)
  - [Recommendations](#recommendations)
- [Implementation Roadmap](#implementation-roadmap)
- [Technical Considerations](#technical-considerations)
- [Development Process & TDD](#development-process--tdd)
- [Next Steps](#next-steps)

---

## System Architecture

[↑ Back to Top](#table-of-contents)

```
┌─────────────────────────────────────────────────────────────┐
│                    UNITY CLIENT (C#)                        │
│  - 3D World Rendering, Player Controller, Physics           │
│  - UI Systems, Inventory, Building/Crafting                 │
│  - WebSocket Client for Real-time AI Communication          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                 NODE.JS API GATEWAY                         │
│  - Express/Fastify REST API + Socket.io                     │
│  - Authentication & Subscription Management                 │
│  - Request Validation & Rate Limiting                       │
│  - Temporal Client (enqueues AI tasks)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ gRPC/HTTP
┌─────────────────────────────────────────────────────────────┐
│              TEMPORAL WORKFLOW ORCHESTRATOR                 │
│  - Long-running AI workflows                                │
│  - Character state management                               │
│  - Quest generation pipelines                               │
│  - Memory decay scheduling                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Activity Calls
┌─────────────────────────────────────────────────────────────┐
│              PYTHON AI WORKERS (DSPy + LLM)                 │
│  - Character AI Agents (DSPy signatures)                    │
│  - Narrative Director Agent (Quest generation)              │
│  - Memory Management (embeddings + vector DB)               │
│  - LLM Integration (OpenAI/Anthropic/local)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              DATA LAYER                                     │
│  - PostgreSQL: Game state, user data, transactions          │
│  - Redis: Real-time state, session cache                    │
│  - Pinecone/Milvus: Vector memory embeddings                │
│  - MinIO/S3: Generated assets, world saves                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Core Infrastructure (Weeks 1-3)

[↑ Back to Top](#table-of-contents)

### 1.1 Project Structure Setup

**Unity Project Structure:**
```
/unity-game
  /Assets
    /Scripts
      /Core
        - GameManager.cs
        - NetworkManager.cs
        - SaveManager.cs
      /Player
        - PlayerController.cs
        - PlayerInventory.cs
        - BuildingSystem.cs
      /AI
        - AICharacter.cs
        - AICharacterManager.cs
        - ChatDialog.cs
      /UI
        - UIManager.cs
        - QuestLogUI.cs
        - ShopUI.cs
      /World
        - WorldManager.cs
        - BlockSystem.cs
    /Prefabs
    /Scenes
    /Resources
    /Plugins
      - WebSocketSharp.dll
      - Newtonsoft.Json.dll
```

**Backend Project Structure:**
```
/game-backend
  /api-gateway
    - src/
      - server.ts
      - routes/
      - middleware/
      - services/
    - package.json
    - Dockerfile
  /temporal-workflows
    - src/
      - workflows/
      - activities/
    - package.json
  /ai-workers
    - src/
      - agents/
      - memory/
      - llm/
    - requirements.txt
    - Dockerfile
  /shared-proto
    - character.proto
    - quest.proto
    - world.proto
  docker-compose.yml
  kubernetes/
```

### 1.2 Communication Protocol

**WebSocket Message Types (Unity ↔ Node.js):**

```typescript
// Message protocol definitions
interface BaseMessage {
  type: MessageType;
  timestamp: number;
  sessionId: string;
}

enum MessageType {
  // Player → Server
  CHARACTER_CHAT = 'CHARACTER_CHAT',
  CHARACTER_OBSERVE = 'CHARACTER_OBSERVE',
  BUILD_ACTION = 'BUILD_ACTION',
  INVENTORY_ACTION = 'INVENTORY_ACTION',
  QUEST_ACTION = 'QUEST_ACTION',
  ECONOMY_TRANSACTION = 'ECONOMY_TRANSACTION',
  
  // Server → Player
  CHARACTER_RESPONSE = 'CHARACTER_RESPONSE',
  CHARACTER_ACTION = 'CHARACTER_ACTION',
  WORLD_EVENT = 'WORLD_EVENT',
  QUEST_UPDATE = 'QUEST_UPDATE',
  ECONOMY_UPDATE = 'ECONOMY_UPDATE',
  ERROR = 'ERROR'
}

// Example: Character interaction
interface CharacterChatMessage extends BaseMessage {
  type: MessageType.CHARACTER_CHAT;
  characterId: string;
  message: string;
  playerContext: {
    location: { x: number; y: number; z: number };
    inventory: string[];
    activeQuests: string[];
  };
}

interface CharacterResponseMessage extends BaseMessage {
  type: MessageType.CHARACTER_RESPONSE;
  characterId: string;
  response: {
    text: string;
    emotionalShift: number;
    action?: string;
  };
  processingTime: number;
}
```

**Unity WebSocket Client:**
```csharp
using WebSocketSharp;
using Newtonsoft.Json;

public class NetworkManager : MonoBehaviour {
    private WebSocket ws;
    private string serverUrl = "wss://api.yourgame.com/ws";
    private string sessionToken;
    
    public static NetworkManager Instance { get; private set; }
    
    void Awake() {
        if (Instance == null) {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        } else {
            Destroy(gameObject);
        }
    }
    
    public void Connect(string token) {
        sessionToken = token;
        ws = new WebSocket(serverUrl);
        
        ws.OnOpen += (sender, e) => {
            Debug.Log("Connected to game server");
            Authenticate();
        };
        
        ws.OnMessage += (sender, e) => {
            HandleMessage(e.Data);
        };
        
        ws.OnError += (sender, e) => {
            Debug.LogError($"WebSocket error: {e.Message}");
        };
        
        ws.OnClose += (sender, e) => {
            Debug.Log($"Connection closed: {e.Reason}");
            // Attempt reconnect
            Invoke(nameof(Reconnect), 5f);
        };
        
        ws.Connect();
    }
    
    void Authenticate() {
        SendMessage(new AuthMessage {
            type = "AUTH",
            token = sessionToken,
            clientVersion = Application.version
        });
    }
    
    public void SendMessage<T>(T message) where T : BaseMessage {
        if (ws?.ReadyState == WebSocketState.Open) {
            string json = JsonConvert.SerializeObject(message);
            ws.Send(json);
        }
    }
    
    void HandleMessage(string json) {
        var baseMsg = JsonConvert.DeserializeObject<BaseMessage>(json);
        
        switch (baseMsg.type) {
            case "CHARACTER_RESPONSE":
                var charResponse = JsonConvert.DeserializeObject<CharacterResponseMessage>(json);
                AICharacterManager.Instance.HandleResponse(charResponse);
                break;
            case "WORLD_EVENT":
                var worldEvent = JsonConvert.DeserializeObject<WorldEventMessage>(json);
                WorldManager.Instance.HandleWorldEvent(worldEvent);
                break;
            case "QUEST_UPDATE":
                var questUpdate = JsonConvert.DeserializeObject<QuestUpdateMessage>(json);
                QuestManager.Instance.HandleQuestUpdate(questUpdate);
                break;
        }
    }
}
```

### 1.3 Node.js API Gateway

```typescript
// api-gateway/src/server.ts
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Connection, Client } from '@temporalio/client';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Redis for rate limiting and session management
const redis = new Redis(process.env.REDIS_URL);
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ws_limit',
  points: 100, // 100 requests
  duration: 60, // per minute
});

// Temporal client for workflow orchestration
const temporalClient = new Client({
  connection: await Connection.connect({ address: process.env.TEMPORAL_HOST }),
});

// WebSocket connection handler
io.on('connection', async (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Authentication middleware
  socket.use(async (packet, next) => {
    try {
      const token = socket.handshake.auth.token;
      const user = await validateToken(token);
      socket.data.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });
  
  // Rate limiting
  socket.use(async (packet, next) => {
    try {
      await rateLimiter.consume(socket.data.user.id);
      next();
    } catch {
      socket.emit('error', { message: 'Rate limit exceeded' });
    }
  });
  
  // Message handlers
  socket.on('CHARACTER_CHAT', async (data) => {
    const workflowId = `character-${data.characterId}-${Date.now()}`;
    
    // Enqueue to Temporal for AI processing
    const handle = await temporalClient.workflow.start(processCharacterInteraction, {
      workflowId,
      taskQueue: 'ai-character-tasks',
      args: [{
        userId: socket.data.user.id,
        characterId: data.characterId,
        message: data.message,
        playerContext: data.playerContext,
        sessionId: socket.id
      }]
    });
    
    // Store pending workflow for cancellation if needed
    socket.data.pendingWorkflows = socket.data.pendingWorkflows || [];
    socket.data.pendingWorkflows.push(handle);
  });
  
  socket.on('BUILD_ACTION', async (data) => {
    // Immediate response - no AI needed
    await validateAndApplyBuildAction(socket.data.user.id, data);
    socket.emit('BUILD_CONFIRMED', { actionId: data.actionId });
    
    // Notify nearby players
    socket.to(`world:${data.worldId}`).emit('BLOCK_CHANGED', data);
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Cleanup pending workflows
    socket.data.pendingWorkflows?.forEach(handle => handle.cancel());
  });
});

httpServer.listen(3000, () => {
  console.log('API Gateway listening on port 3000');
});
```

### 1.4 Database Schema

**PostgreSQL Schema:**
```sql
-- Users and subscriptions
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steam_id VARCHAR(255) UNIQUE,
    email VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'starter',
    agent_limit INTEGER DEFAULT 3,
    credits INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Game worlds
CREATE TABLE worlds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id),
    name VARCHAR(255),
    seed VARCHAR(255),
    size VARCHAR(50), -- small, medium, large
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP
);

-- AI Characters
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES worlds(id),
    name VARCHAR(255),
    role VARCHAR(100), -- farmer, merchant, quest_giver
    personality_profile JSONB,
    current_location JSONB, -- {x, y, z}
    current_mood VARCHAR(50),
    memory_summary TEXT, -- Compressed long-term memory
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Character memories (with vector embeddings)
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID REFERENCES characters(id),
    content TEXT NOT NULL,
    importance_score FLOAT DEFAULT 0.5, -- 0.0 to 1.0
    embedding VECTOR(1536), -- OpenAI embedding dimension
    timestamp TIMESTAMP DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP
);

-- Create index for vector similarity search
CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops);

-- Quests
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES worlds(id),
    generated_by VARCHAR(100), -- 'narrative_director', 'character', 'player'
    title VARCHAR(255),
    description TEXT,
    objectives JSONB, -- Array of {description, completed, target}
    rewards JSONB, -- {credits, items: []}
    involved_characters UUID[],
    status VARCHAR(50) DEFAULT 'active', -- active, completed, failed
    difficulty INTEGER, -- 1-5
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Player quest progress
CREATE TABLE player_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    quest_id UUID REFERENCES quests(id),
    progress JSONB, -- Custom progress tracking
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Inventory system
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    item_type VARCHAR(100), -- block, tool, vehicle, clothing
    item_id VARCHAR(255), -- Reference to asset
    quantity INTEGER DEFAULT 1,
    metadata JSONB, -- Custom properties
    acquired_at TIMESTAMP DEFAULT NOW()
);

-- World block data (Minecraft-style)
CREATE TABLE world_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES worlds(id),
    x INTEGER,
    y INTEGER,
    z INTEGER,
    block_type INTEGER,
    metadata JSONB,
    placed_by UUID REFERENCES users(id),
    placed_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index for block queries
CREATE INDEX idx_world_blocks_location ON world_blocks(world_id, x, y, z);

-- Shop assets
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    category VARCHAR(100), -- vehicle, clothing, furniture, block_pack
    price INTEGER,
    description TEXT,
    preview_url VARCHAR(500),
    metadata JSONB, -- 3D model path, stats, etc.
    is_active BOOLEAN DEFAULT true
);
```

---

## Phase 2: AI Agent System (Weeks 4-6)

[↑ Back to Top](#table-of-contents)

### 2.1 DSPy Character Agent Architecture

**Core Agent Implementation:**
```python
# ai-workers/src/agents/character_agent.py
import dspy
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class CharacterContext:
    character_id: str
    name: str
    role: str
    personality_traits: List[str]
    current_mood: str
    current_location: Dict[str, float]
    recent_memories: List[Dict]
    active_quests: List[Dict]
    relationships: Dict[str, str]  # character_id -> relationship_type

@dataclass
class ObservationContext:
    nearby_characters: List[str]
    nearby_objects: List[str]
    time_of_day: str
    weather: str
    recent_events: List[str]

class CharacterResponseSignature(dspy.Signature):
    """
    You are an AI character in an open-world farming simulation game.
    
    Character Information:
    - Name: {name}
    - Role: {role}
    - Personality: {personality_traits}
    - Current Mood: {current_mood}
    
    Recent Memories:
    {recent_memories}
    
    Current Situation:
    - Location: {location}
    - Time: {time_of_day}
    - Weather: {weather}
    - Nearby: {nearby_characters}
    
    Active Quests:
    {active_quests}
    
    Player says: {player_message}
    
    Respond naturally as this character would. Consider your personality,
    memories, and current situation. You can:
    1. Have a conversation
    2. Offer or accept quests
    3. Trade items
    4. React to world events
    5. Perform physical actions
    """
    
    name = dspy.InputField()
    role = dspy.InputField()
    personality_traits = dspy.InputField()
    current_mood = dspy.InputField()
    recent_memories = dspy.InputField()
    location = dspy.InputField()
    time_of_day = dspy.InputField()
    weather = dspy.InputField()
    nearby_characters = dspy.InputField()
    active_quests = dspy.InputField()
    player_message = dspy.InputField()
    
    response_text = dspy.OutputField(desc="Character's dialogue response")
    emotional_shift = dspy.OutputField(desc="Mood change: -1.0 (much worse) to +1.0 (much better)")
    memory_to_store = dspy.OutputField(desc="Important information to remember from this interaction")
    memory_importance = dspy.OutputField(desc="Importance of this memory: 0.0 to 1.0")
    action = dspy.OutputField(desc="Physical action to take: MOVE, TRADE, GIVE_QUEST, EMOTE, or NONE")
    action_target = dspy.OutputField(desc="Target of action if applicable")

class CharacterAgent:
    def __init__(self, llm_client, memory_manager):
        self.llm = llm_client
        self.memory = memory_manager
        self.predictor = dspy.Predict(CharacterResponseSignature)
        
    async def process_interaction(
        self, 
        character_context: CharacterContext,
        observation: ObservationContext,
        player_message: str,
        player_context: Dict
    ) -> Dict:
        """
        Process a player interaction and generate a response.
        """
        # Retrieve relevant memories
        relevant_memories = await self.memory.get_relevant_memories(
            character_id=character_context.character_id,
            query=player_message,
            limit=5
        )
        
        # Format memories for prompt
        memory_text = "\n".join([
            f"- {m['content']} (importance: {m['importance_score']:.2f})"
            for m in relevant_memories
        ])
        
        # Generate response using DSPy
        with dspy.settings.context(lm=self.llm):
            result = self.predictor(
                name=character_context.name,
                role=character_context.role,
                personality_traits=", ".join(character_context.personality_traits),
                current_mood=character_context.current_mood,
                recent_memories=memory_text,
                location=f"({observation.current_location['x']:.1f}, {observation.current_location['y']:.1f}, {observation.current_location['z']:.1f})",
                time_of_day=observation.time_of_day,
                weather=observation.weather,
                nearby_characters=", ".join(observation.nearby_characters),
                active_quests=str(character_context.active_quests),
                player_message=player_message
            )
        
        # Store new memory if important enough
        if float(result.memory_importance) > 0.3:
            await self.memory.store_memory(
                character_id=character_context.character_id,
                content=result.memory_to_store,
                importance=float(result.memory_importance),
                related_to=player_context.get('player_id')
            )
        
        # Update character mood
        new_mood = self.calculate_new_mood(
            character_context.current_mood,
            float(result.emotional_shift)
        )
        
        return {
            "response_text": result.response_text,
            "emotional_shift": float(result.emotional_shift),
            "new_mood": new_mood,
            "action": result.action,
            "action_target": result.action_target,
            "memory_stored": result.memory_to_store if float(result.memory_importance) > 0.3 else None
        }
    
    def calculate_new_mood(self, current_mood: str, shift: float) -> str:
        """Calculate new mood based on emotional shift."""
        mood_scale = {
            'depressed': -2,
            'sad': -1,
            'neutral': 0,
            'happy': 1,
            'excited': 2
        }
        
        current_val = mood_scale.get(current_mood, 0)
        new_val = max(-2, min(2, current_val + shift))
        
        # Map back to mood string
        for mood, val in mood_scale.items():
            if val == round(new_val):
                return mood
        return 'neutral'
```

### 2.2 Memory Management System

```python
# ai-workers/src/memory/memory_manager.py
import numpy as np
from typing import List, Dict, Optional
import hashlib
from datetime import datetime, timedelta
import openai

class MemoryManager:
    def __init__(self, vector_db, embedding_model: str = "text-embedding-3-small"):
        self.vector_db = vector_db
        self.embedding_model = embedding_model
        self.openai_client = openai.AsyncOpenAI()
        
    async def embed(self, text: str) -> List[float]:
        """Generate embedding vector for text."""
        response = await self.openai_client.embeddings.create(
            model=self.embedding_model,
            input=text
        )
        return response.data[0].embedding
    
    async def store_memory(
        self, 
        character_id: str, 
        content: str, 
        importance: float,
        related_to: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Store a new memory with embedding vector.
        """
        # Generate embedding
        embedding = await self.embed(content)
        
        # Create unique ID
        memory_id = hashlib.md5(
            f"{character_id}:{content}:{datetime.now().isoformat()}".encode()
        ).hexdigest()
        
        # Store in vector database
        await self.vector_db.upsert(
            vectors=[{
                "id": memory_id,
                "values": embedding,
                "metadata": {
                    "character_id": character_id,
                    "content": content,
                    "importance": importance,
                    "timestamp": datetime.now().isoformat(),
                    "access_count": 0,
                    "last_accessed": datetime.now().isoformat(),
                    "related_to": related_to,
                    **(metadata or {})
                }
            }]
        )
        
        return memory_id
    
    async def get_relevant_memories(
        self, 
        character_id: str, 
        query: str, 
        limit: int = 5,
        recency_weight: float = 0.3,
        importance_weight: float = 0.4,
        relevance_weight: float = 0.3
    ) -> List[Dict]:
        """
        Retrieve relevant memories using hybrid scoring:
        - Semantic similarity (relevance to query)
        - Recency (how recent)
        - Importance (how significant)
        - Access frequency (how often recalled)
        """
        # Generate query embedding
        query_embedding = await self.embed(query)
        
        # Search vector database
        results = await self.vector_db.query(
            vector=query_embedding,
            filter={"character_id": character_id},
            top_k=limit * 3,  # Get extra for filtering
            include_metadata=True
        )
        
        # Score and rank memories
        scored_memories = []
        now = datetime.now()
        
        for match in results.matches:
            metadata = match.metadata
            
            # Calculate recency score (exponential decay)
            memory_time = datetime.fromisoformat(metadata['timestamp'])
            age_hours = (now - memory_time).total_seconds() / 3600
            recency_score = np.exp(-age_hours / 48)  # 48-hour half-life
            
            # Importance score (already stored)
            importance_score = metadata['importance']
            
            # Relevance score (from vector similarity)
            relevance_score = match.score
            
            # Access boost (memories recalled often are more accessible)
            access_boost = min(metadata['access_count'] * 0.05, 0.2)
            
            # Combined score
            final_score = (
                recency_weight * recency_score +
                importance_weight * importance_score +
                relevance_weight * relevance_score +
                access_boost
            )
            
            scored_memories.append((final_score, match))
        
        # Sort by score and take top memories
        scored_memories.sort(reverse=True, key=lambda x: x[0])
        top_memories = scored_memories[:limit]
        
        # Update access counts for retrieved memories
        for score, match in top_memories:
            await self.vector_db.update(
                id=match.id,
                set_metadata={
                    "access_count": match.metadata['access_count'] + 1,
                    "last_accessed": now.isoformat()
                }
            )
        
        # Format results
        return [
            {
                "id": match.id,
                "content": match.metadata['content'],
                "importance_score": match.metadata['importance'],
                "timestamp": match.metadata['timestamp'],
                "retrieval_score": score
            }
            for score, match in top_memories
        ]
    
    async def consolidate_memories(self, character_id: str):
        """
        Periodically consolidate old memories into summaries.
        Called by Temporal workflow to prevent memory bloat.
        """
        # Get old, low-importance memories
        old_memories = await self.vector_db.query(
            filter={
                "character_id": character_id,
                "timestamp": {"$lt": (datetime.now() - timedelta(days=7)).isoformat()},
                "importance": {"$lt": 0.5}
            },
            top_k=100
        )
        
        if len(old_memories.matches) < 10:
            return  # Not enough to consolidate
        
        # Group by theme using embeddings
        # (Simplified - in production use clustering algorithm)
        
        # Generate summary using LLM
        memory_contents = [m.metadata['content'] for m in old_memories.matches]
        summary_prompt = f"""
        Summarize these memories into 2-3 key facts:
        {chr(10).join(f"- {m}" for m in memory_contents)}
        """
        
        summary = await self.llm_generate(summary_prompt)
        
        # Store summary as new high-importance memory
        await self.store_memory(
            character_id=character_id,
            content=summary,
            importance=0.7,  # Higher importance for consolidated memories
            metadata={"type": "consolidated_summary", "source_count": len(old_memories.matches)}
        )
        
        # Delete old individual memories
        for match in old_memories.matches:
            await self.vector_db.delete(ids=[match.id])
```

### 2.3 Narrative Director Agent

```python
# ai-workers/src/agents/narrative_director.py
import dspy
from typing import List, Dict
from datetime import datetime, timedelta
import random

class QuestGenerationSignature(dspy.Signature):
    """
    You are the Narrative Director for an open-world farming simulation game.
    Your job is to generate compelling quests that drive player engagement.
    
    World State:
    - Current Season: {season}
    - Time of Day: {time_of_day}
    - Recent Events: {recent_events}
    - Active Players: {active_player_count}
    
    Available Characters:
    {character_summaries}
    
    Existing Quests:
    {active_quests}
    
    Generate {quest_count} new quests that:
    1. Create interesting character interactions
    2. Progress world storylines naturally
    3. Offer varied difficulty levels
    4. Connect to current world events
    5. Provide meaningful rewards
    
    For each quest, specify:
    - Title and description
    - Objectives (specific, measurable)
    - Involved characters
    - Rewards (credits and items)
    - Estimated completion time
    """
    
    season = dspy.InputField()
    time_of_day = dspy.InputField()
    recent_events = dspy.InputField()
    active_player_count = dspy.InputField()
    character_summaries = dspy.InputField()
    active_quests = dspy.InputField()
    quest_count = dspy.InputField()
    
    generated_quests = dspy.OutputField(desc="JSON array of quest objects")

class NarrativeDirector:
    def __init__(self, llm_client, db_client):
        self.llm = llm_client
        self.db = db_client
        self.quest_generator = dspy.Predict(QuestGenerationSignature)
        
    async def generate_world_quests(self, world_id: str) -> List[Dict]:
        """
        Generate new quests for a world based on current state.
        Called periodically by Temporal workflow.
        """
        # Gather world state
        world = await self.db.get_world(world_id)
        characters = await self.db.get_active_characters(world_id)
        active_quests = await self.db.get_active_quests(world_id)
        recent_events = await self.db.get_recent_world_events(world_id, hours=24)
        
        # Format context
        character_summaries = "\n".join([
            f"- {c['name']} ({c['role']}): {c['personality_summary']}"
            for c in characters[:10]  # Limit to prevent token overflow
        ])
        
        # Determine how many quests to generate
        target_quests = 5
        current_quests = len(active_quests)
        quests_to_generate = max(0, target_quests - current_quests)
        
        if quests_to_generate == 0:
            return []
        
        # Generate quests using DSPy
        with dspy.settings.context(lm=self.llm):
            result = self.quest_generator(
                season=world.get('season', 'spring'),
                time_of_day=world.get('time_of_day', 'morning'),
                recent_events=str(recent_events),
                active_player_count=str(world.get('active_players', 1)),
                character_summaries=character_summaries,
                active_quests=str([q['title'] for q in active_quests]),
                quest_count=str(quests_to_generate)
            )
        
        # Parse and validate generated quests
        quests = self._parse_quests(result.generated_quests)
        
        # Store in database
        stored_quests = []
        for quest in quests:
            quest_id = await self.db.create_quest(
                world_id=world_id,
                generated_by='narrative_director',
                **quest
            )
            stored_quests.append({**quest, "id": quest_id})
        
        return stored_quests
    
    async def evaluate_interaction_impact(
        self, 
        world_id: str, 
        interaction: Dict
    ) -> Optional[Dict]:
        """
        Evaluate if a character interaction should trigger world events
        or new quests. Called reactively by Temporal workflow.
        """
        # Check for significant interactions
        if interaction.get('significance_score', 0) < 0.7:
            return None
        
        # Generate appropriate world event
        event = await self._generate_world_event(world_id, interaction)
        
        if event:
            await self.db.create_world_event(world_id, event)
            return event
        
        return None
    
    async def _generate_world_event(
        self, 
        world_id: str, 
        trigger: Dict
    ) -> Optional[Dict]:
        """Generate a world event based on a significant interaction."""
        event_types = [
            'character_conflict',
            'opportunity',
            'discovery',
            'celebration',
            'crisis'
        ]
        
        # Use LLM to determine appropriate event type and details
        prompt = f"""
        A significant interaction occurred:
        {trigger}
        
        What type of world event should this trigger?
        Options: {event_types}
        
        Return JSON with:
        - type: event type
        - description: what happens
        - affected_characters: who is involved
        - duration: how long it lasts
        """
        
        # Generate event (simplified)
        return {
            "type": random.choice(event_types),
            "description": "A new opportunity emerges from the interaction",
            "affected_characters": trigger.get('involved_characters', []),
            "duration_hours": 24,
            "created_at": datetime.now().isoformat()
        }
    
    def _parse_quests(self, quest_text: str) -> List[Dict]:
        """Parse generated quest text into structured format."""
        # In production, use structured output or JSON parsing
        # This is a simplified version
        import json
        try:
            return json.loads(quest_text)
        except:
            # Fallback: return empty list or use regex parsing
            return []
```

---

## Phase 3: Temporal Workflow Orchestration

[↑ Back to Top](#table-of-contents)

### 3.1 Workflow Definitions

```typescript
// temporal-workflows/src/workflows/characterInteraction.ts
import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';
import type * as activities from '../activities';

const { 
  getCharacterContext, 
  getObservationContext,
  processAIResponse,
  updateCharacterState,
  notifyPlayer 
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30s',
  retry: { maximumAttempts: 3 }
});

// Signal to cancel processing if player disconnects
export const cancelInteraction = defineSignal('cancelInteraction');

export async function processCharacterInteraction(
  input: {
    userId: string;
    characterId: string;
    message: string;
    playerContext: any;
    sessionId: string;
  }
): Promise<void> {
  let isCancelled = false;
  
  // Handle cancellation signal
  setHandler(cancelInteraction, () => {
    isCancelled = true;
  });
  
  // Fetch character context
  const characterContext = await getCharacterContext(input.characterId);
  
  // Fetch observation context
  const observation = await getObservationContext(
    input.characterId,
    input.playerContext.location
  );
  
  if (isCancelled) return;
  
  // Process AI response (calls Python AI worker)
  const response = await processAIResponse({
    characterContext,
    observation,
    playerMessage: input.message,
    playerContext: input.playerContext
  });
  
  if (isCancelled) return;
  
  // Update character state
  await updateCharacterState(input.characterId, {
    mood: response.new_mood,
    lastInteraction: new Date().toISOString()
  });
  
  // Notify player
  await notifyPlayer(input.sessionId, {
    type: 'CHARACTER_RESPONSE',
    characterId: input.characterId,
    response: {
      text: response.response_text,
      emotionalShift: response.emotional_shift,
      action: response.action,
      actionTarget: response.action_target
    }
  });
  
  // If action is time-consuming, handle it asynchronously
  if (response.action && response.action !== 'NONE') {
    await handleCharacterAction(input.characterId, response.action, response.action_target);
  }
}

async function handleCharacterAction(
  characterId: string, 
  action: string, 
  target: string
): Promise<void> {
  // Handle different action types
  switch (action) {
    case 'MOVE':
      // Start movement workflow
      break;
    case 'TRADE':
      // Open trade interface
      break;
    case 'GIVE_QUEST':
      // Generate quest offer
      break;
    case 'EMOTE':
      // Play animation
      break;
  }
}
```

```typescript
// temporal-workflows/src/workflows/narrativeDirector.ts
import { proxyActivities, continueAsNew } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
  getWorldState,
  generateQuests,
  evaluateWorldEvents,
  consolidateMemories
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2m',
  retry: { maximumAttempts: 2 }
});

export async function narrativeDirectorWorkflow(
  worldId: string,
  lastRunTime: string
): Promise<void> {
  // Run every 5 minutes
  const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  while (true) {
    const worldState = await getWorldState(worldId);
    
    // Generate new quests if needed
    await generateQuests(worldId);
    
    // Evaluate world events
    await evaluateWorldEvents(worldId);
    
    // Consolidate memories for all characters in world
    await consolidateMemories(worldId);
    
    // Continue as new to prevent workflow history from growing too large
    await continueAsNew(worldId, new Date().toISOString());
    
    // Sleep until next check
    await sleep(CHECK_INTERVAL);
  }
}
```

### 3.2 Activity Implementations

```python
# temporal-workflows/activities/ai_activities.py
from temporalio import activity
from temporalio.exceptions import ApplicationError
import asyncio

@activity.defn
async def process_ai_response(input: dict) -> dict:
    """
    Activity that calls the Python AI worker to process character interaction.
    """
    try:
        # Import AI agent
        from ai_workers.agents.character_agent import CharacterAgent
        from ai_workers.memory.memory_manager import MemoryManager
        
        # Initialize components
        memory_manager = MemoryManager(vector_db=get_vector_db())
        agent = CharacterAgent(
            llm_client=get_llm_client(),
            memory_manager=memory_manager
        )
        
        # Process interaction
        result = await agent.process_interaction(
            character_context=input['characterContext'],
            observation=input['observation'],
            player_message=input['playerMessage'],
            player_context=input['playerContext']
        )
        
        return result
        
    except Exception as e:
        raise ApplicationError(f"AI processing failed: {str(e)}")

@activity.defn
async def generate_quests(world_id: str) -> list:
    """
    Activity to generate new quests for a world.
    """
    from ai_workers.agents.narrative_director import NarrativeDirector
    
    director = NarrativeDirector(
        llm_client=get_llm_client(),
        db_client=get_db_client()
    )
    
    quests = await director.generate_world_quests(world_id)
    return quests

@activity.defn
async def consolidate_memories(world_id: str) -> None:
    """
    Activity to consolidate old memories for all characters in a world.
    """
    from ai_workers.memory.memory_manager import MemoryManager
    
    memory_manager = MemoryManager(vector_db=get_vector_db())
    
    # Get all characters in world
    characters = await get_db_client().get_world_characters(world_id)
    
    # Consolidate memories for each character
    for character in characters:
        await memory_manager.consolidate_memories(character['id'])
```

---

## Phase 4: Unity Game Implementation

[↑ Back to Top](#table-of-contents)

### 4.1 Core Systems

**Player Controller:**
```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour {
    [Header("Movement")]
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float sprintSpeed = 8f;
    [SerializeField] private float rotationSpeed = 10f;
    [SerializeField] private float jumpForce = 5f;
    
    [Header("Interaction")]
    [SerializeField] private float interactDistance = 3f;
    [SerializeField] private LayerMask interactableLayers;
    
    [Header("References")]
    [SerializeField] private Camera playerCamera;
    [SerializeField] private CharacterController characterController;
    
    private Vector2 moveInput;
    private Vector2 lookInput;
    private bool isSprinting;
    private bool jumpPressed;
    private float verticalVelocity;
    
    private void OnEnable() {
        // Subscribe to input events
        var input = GetComponent<PlayerInput>();
        input.actions["Move"].performed += ctx => moveInput = ctx.ReadValue<Vector2>();
        input.actions["Move"].canceled += ctx => moveInput = Vector2.zero;
        input.actions["Look"].performed += ctx => lookInput = ctx.ReadValue<Vector2>();
        input.actions["Sprint"].performed += ctx => isSprinting = true;
        input.actions["Sprint"].canceled += ctx => isSprinting = false;
        input.actions["Jump"].performed += ctx => jumpPressed = true;
        input.actions["Interact"].performed += ctx => HandleInteraction();
    }
    
    private void Update() {
        HandleMovement();
        HandleRotation();
        HandleGravity();
    }
    
    void HandleMovement() {
        float speed = isSprinting ? sprintSpeed : moveSpeed;
        
        Vector3 forward = transform.forward * moveInput.y;
        Vector3 right = transform.right * moveInput.x;
        Vector3 moveDirection = (forward + right).normalized * speed;
        
        // Apply vertical velocity
        moveDirection.y = verticalVelocity;
        
        characterController.Move(moveDirection * Time.deltaTime);
    }
    
    void HandleRotation() {
        // Rotate player based on camera look
        float yaw = lookInput.x * rotationSpeed * Time.deltaTime;
        transform.Rotate(Vector3.up * yaw);
    }
    
    void HandleGravity() {
        if (characterController.isGrounded) {
            if (jumpPressed) {
                verticalVelocity = jumpForce;
                jumpPressed = false;
            } else {
                verticalVelocity = -0.5f; // Small downward force when grounded
            }
        } else {
            verticalVelocity += Physics.gravity.y * Time.deltaTime;
        }
    }
    
    void HandleInteraction() {
        RaycastHit hit;
        if (Physics.Raycast(
            playerCamera.transform.position,
            playerCamera.transform.forward,
            out hit,
            interactDistance,
            interactableLayers
        )) {
            // Check for AI character
            var aiCharacter = hit.collider.GetComponent<AICharacter>();
            if (aiCharacter != null) {
                OpenCharacterDialog(aiCharacter);
                return;
            }
            
            // Check for interactable object
            var interactable = hit.collider.GetComponent<IInteractable>();
            if (interactable != null) {
                interactable.Interact(this);
            }
        }
    }
    
    void OpenCharacterDialog(AICharacter character) {
        UIManager.Instance.OpenChatDialog(character);
        
        // Send observation to backend
        NetworkManager.Instance.SendMessage(new CharacterObserveMessage {
            type = MessageType.CHARACTER_OBSERVE,
            characterId = character.CharacterId,
            playerLocation = transform.position,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });
    }
}
```

**Building System (Minecraft-style):**
```csharp
using UnityEngine;
using System.Collections.Generic;

public class BuildingSystem : MonoBehaviour {
    [Header("Blocks")]
    [SerializeField] private GameObject[] blockPrefabs;
    [SerializeField] private Material highlightMaterial;
    
    [Header("Settings")]
    [SerializeField] private float reachDistance = 5f;
    [SerializeField] private LayerMask buildableLayers;
    
    private int selectedBlockIndex = 0;
    private GameObject highlightCube;
    private Camera playerCamera;
    
    private void Start() {
        playerCamera = Camera.main;
        CreateHighlightCube();
    }
    
    private void Update() {
        HandleBlockSelection();
        HandleBuilding();
        UpdateHighlight();
    }
    
    void HandleBlockSelection() {
        // Number keys 1-9 for block selection
        for (int i = 0; i < 9; i++) {
            if (Input.GetKeyDown(KeyCode.Alpha1 + i)) {
                selectedBlockIndex = i % blockPrefabs.Length;
                UIManager.Instance.UpdateSelectedBlock(selectedBlockIndex);
            }
        }
        
        // Mouse scroll
        float scroll = Input.GetAxis("Mouse ScrollWheel");
        if (scroll != 0) {
            selectedBlockIndex += scroll > 0 ? 1 : -1;
            selectedBlockIndex = Mathf.Clamp(selectedBlockIndex, 0, blockPrefabs.Length - 1);
            UIManager.Instance.UpdateSelectedBlock(selectedBlockIndex);
        }
    }
    
    void HandleBuilding() {
        // Place block (left click)
        if (Input.GetMouseButtonDown(0)) {
            RaycastHit hit;
            if (Physics.Raycast(
                playerCamera.transform.position,
                playerCamera.transform.forward,
                out hit,
                reachDistance,
                buildableLayers
            )) {
                // Calculate placement position
                Vector3 placePosition = hit.point + hit.normal * 0.5f;
                placePosition = SnapToGrid(placePosition);
                
                // Check if position is empty
                if (CanPlaceBlock(placePosition)) {
                    PlaceBlock(placePosition, selectedBlockIndex);
                }
            }
        }
        
        // Remove block (right click)
        if (Input.GetMouseButtonDown(1)) {
            RaycastHit hit;
            if (Physics.Raycast(
                playerCamera.transform.position,
                playerCamera.transform.forward,
                out hit,
                reachDistance,
                buildableLayers
            )) {
                RemoveBlock(hit.collider.gameObject);
            }
        }
    }
    
    Vector3 SnapToGrid(Vector3 position) {
        return new Vector3(
            Mathf.Round(position.x),
            Mathf.Round(position.y),
            Mathf.Round(position.z)
        );
    }
    
    bool CanPlaceBlock(Vector3 position) {
        // Check if position is occupied
        Collider[] colliders = Physics.OverlapBox(
            position,
            Vector3.one * 0.4f,
            Quaternion.identity,
            buildableLayers
        );
        return colliders.Length == 0;
    }
    
    void PlaceBlock(Vector3 position, int blockType) {
        // Instantiate locally
        GameObject block = Instantiate(
            blockPrefabs[blockType],
            position,
            Quaternion.identity
        );
        
        // Add to world manager
        WorldManager.Instance.RegisterBlock(block, position, blockType);
        
        // Send to server
        NetworkManager.Instance.SendMessage(new BuildActionMessage {
            type = MessageType.BUILD_ACTION,
            action = "PLACE",
            position = position,
            blockType = blockType,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });
        
        // Play sound effect
        AudioManager.Instance.PlaySound("place_block");
    }
    
    void RemoveBlock(GameObject block) {
        // Check if player owns this block or has permission
        BlockData blockData = block.GetComponent<BlockData>();
        if (blockData == null) return;
        
        // Remove locally
        WorldManager.Instance.UnregisterBlock(block);
        Destroy(block);
        
        // Send to server
        NetworkManager.Instance.SendMessage(new BuildActionMessage {
            type = MessageType.BUILD_ACTION,
            action = "REMOVE",
            position = block.transform.position,
            blockType = blockData.BlockType,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });
        
        // Play sound effect
        AudioManager.Instance.PlaySound("break_block");
    }
    
    void UpdateHighlight() {
        RaycastHit hit;
        if (Physics.Raycast(
            playerCamera.transform.position,
            playerCamera.transform.forward,
            out hit,
            reachDistance,
            buildableLayers
        )) {
            Vector3 highlightPos = hit.point + hit.normal * 0.5f;
            highlightPos = SnapToGrid(highlightPos);
            highlightCube.transform.position = highlightPos;
            highlightCube.SetActive(true);
        } else {
            highlightCube.SetActive(false);
        }
    }
    
    void CreateHighlightCube() {
        highlightCube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        highlightCube.GetComponent<MeshRenderer>().material = highlightMaterial;
        highlightCube.GetComponent<Collider>().enabled = false;
        highlightCube.transform.localScale = Vector3.one * 1.01f;
        highlightCube.SetActive(false);
    }
}
```

**AI Character Controller:**
```csharp
using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using TMPro;

public class AICharacter : MonoBehaviour {
    [Header("Character Info")]
    public string CharacterId;
    public string CharacterName;
    public string CharacterRole;
    
    [Header("AI State")]
    public string CurrentMood = "neutral";
    public bool IsProcessing = false;
    public float ResponseDelay = 0.5f;
    
    [Header("Visual")]
    [SerializeField] private GameObject nameTagPrefab;
    [SerializeField] private Transform nameTagPosition;
    [SerializeField] private Animator animator;
    
    private Queue<DialogueMessage> responseQueue = new Queue<DialogueMessage>();
    private GameObject nameTagInstance;
    private bool isTyping = false;
    
    private void Start() {
        CreateNameTag();
    }
    
    void CreateNameTag() {
        if (nameTagPrefab != null && nameTagPosition != null) {
            nameTagInstance = Instantiate(nameTagPrefab, nameTagPosition);
            var textComponent = nameTagInstance.GetComponentInChildren<TextMeshPro>();
            if (textComponent != null) {
                textComponent.text = CharacterName;
            }
        }
    }
    
    public void OnPlayerApproach() {
        // Trigger greeting animation
        animator?.SetTrigger("Wave");
        
        // Send observation to backend
        NetworkManager.Instance.SendMessage(new CharacterObserveMessage {
            type = MessageType.CHARACTER_OBSERVE,
            characterId = CharacterId,
            observation = "Player approached",
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });
    }
    
    public void OnPlayerInteract(string playerMessage) {
        if (IsProcessing) {
            // Queue message if already processing
            return;
        }
        
        IsProcessing = true;
        
        // Show thinking indicator
        UIManager.Instance.ShowThinkingIndicator(CharacterId);
        
        // Send to backend
        NetworkManager.Instance.SendMessage(new CharacterChatMessage {
            type = MessageType.CHARACTER_CHAT,
            characterId = CharacterId,
            message = playerMessage,
            playerContext = new PlayerContext {
                location = transform.position,
                inventory = Inventory.Instance.GetItemNames(),
                activeQuests = QuestManager.Instance.GetActiveQuestIds()
            },
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });
    }
    
    public void ReceiveResponse(CharacterResponse response) {
        IsProcessing = false;
        
        // Update mood
        CurrentMood = response.NewMood;
        
        // Display response
        if (UIManager.Instance.IsDialogOpen(this)) {
            StartCoroutine(DisplayResponse(response));
        } else {
            // Store for later if dialog closed
            responseQueue.Enqueue(response);
        }
        
        // Handle action
        if (!string.IsNullOrEmpty(response.Action) && response.Action != "NONE") {
            ExecuteAction(response.Action, response.ActionTarget);
        }
    }
    
    IEnumerator DisplayResponse(CharacterResponse response) {
        isTyping = true;
        
        string fullText = response.ResponseText;
        string displayedText = "";
        
        // Type out response
        for (int i = 0; i < fullText.Length; i++) {
            displayedText += fullText[i];
            UIManager.Instance.UpdateDialogText(CharacterId, displayedText);
            
            // Variable typing speed based on punctuation
            float delay = 0.03f;
            if (".!?".Contains(fullText[i])) delay = 0.2f;
            else if (",;".Contains(fullText[i])) delay = 0.1f;
            
            yield return new WaitForSeconds(delay);
        }
        
        isTyping = false;
    }
    
    void ExecuteAction(string action, string target) {
        switch (action.ToUpper()) {
            case "MOVE":
                StartCoroutine(MoveToTarget(target));
                break;
            case "TRADE":
                UIManager.Instance.OpenTradeInterface(this);
                break;
            case "GIVE_QUEST":
                QuestManager.Instance.OfferQuest(target, this);
                break;
            case "EMOTE":
                animator?.SetTrigger(target);
                break;
        }
    }
    
    IEnumerator MoveToTarget(string target) {
        // Parse target location
        Vector3 targetPos = ParseTarget(target);
        
        // Simple movement (in production use NavMesh)
        while (Vector3.Distance(transform.position, targetPos) > 0.1f) {
            Vector3 direction = (targetPos - transform.position).normalized;
            transform.position += direction * 2f * Time.deltaTime;
            transform.rotation = Quaternion.LookRotation(direction);
            yield return null;
        }
    }
    
    Vector3 ParseTarget(string target) {
        // Parse from string like "(10.5, 0, 20.3)"
        // Implementation...
        return transform.position;
    }
    
    private void OnTriggerEnter(Collider other) {
        if (other.CompareTag("Player")) {
            OnPlayerApproach();
        }
    }
}
```

### 4.2 UI Systems

**Chat Dialog:**
```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

public class ChatDialog : MonoBehaviour {
    [Header("UI Components")]
    [SerializeField] private TextMeshProUGUI characterNameText;
    [SerializeField] private ScrollRect messageScroll;
    [SerializeField] private Transform messageContainer;
    [SerializeField] private GameObject playerMessagePrefab;
    [SerializeField] private GameObject npcMessagePrefab;
    [SerializeField] private TMP_InputField inputField;
    [SerializeField] private Button sendButton;
    [SerializeField] private GameObject typingIndicator;
    
    private AICharacter currentCharacter;
    private List<GameObject> messageObjects = new List<GameObject>();
    
    private void OnEnable() {
        sendButton.onClick.AddListener(SendMessage);
        inputField.onSubmit.AddListener(_ => SendMessage());
    }
    
    private void OnDisable() {
        sendButton.onClick.RemoveListener(SendMessage);
        inputField.onSubmit.RemoveListener(_ => SendMessage());
    }
    
    public void Open(AICharacter character) {
        currentCharacter = character;
        characterNameText.text = character.CharacterName;
        
        // Clear previous messages
        ClearMessages();
        
        // Load conversation history
        LoadHistory();
        
        gameObject.SetActive(true);
        inputField.ActivateInputField();
    }
    
    public void Close() {
        gameObject.SetActive(false);
        currentCharacter = null;
    }
    
    void ClearMessages() {
        foreach (var msg in messageObjects) {
            Destroy(msg);
        }
        messageObjects.Clear();
    }
    
    async void LoadHistory() {
        // Fetch conversation history from server
        var history = await NetworkManager.Instance.GetConversationHistory(
            currentCharacter.CharacterId
        );
        
        foreach (var message in history) {
            if (message.isPlayer) {
                AddPlayerMessage(message.text);
            } else {
                AddNPCMessage(message.text);
            }
        }
    }
    
    public void SendMessage() {
        string text = inputField.text.Trim();
        if (string.IsNullOrEmpty(text)) return;
        
        // Display player message immediately
        AddPlayerMessage(text);
        inputField.text = "";
        inputField.ActivateInputField();
        
        // Send to AI
        currentCharacter.OnPlayerInteract(text);
        
        // Show typing indicator
        ShowTypingIndicator();
    }
    
    void AddPlayerMessage(string text) {
        GameObject msgObj = Instantiate(playerMessagePrefab, messageContainer);
        msgObj.GetComponentInChildren<TextMeshProUGUI>().text = text;
        messageObjects.Add(msgObj);
        
        ScrollToBottom();
    }
    
    public void AddNPCMessage(string text) {
        HideTypingIndicator();
        
        GameObject msgObj = Instantiate(npcMessagePrefab, messageContainer);
        msgObj.GetComponentInChildren<TextMeshProUGUI>().text = text;
        messageObjects.Add(msgObj);
        
        ScrollToBottom();
    }
    
    public void ShowTypingIndicator() {
        typingIndicator.SetActive(true);
        ScrollToBottom();
    }
    
    public void HideTypingIndicator() {
        typingIndicator.SetActive(false);
    }
    
    void ScrollToBottom() {
        Canvas.ForceUpdateCanvases();
        messageScroll.verticalNormalizedPosition = 0f;
    }
}
```

**Quest UI:**
```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

public class QuestLogUI : MonoBehaviour {
    [Header("UI Components")]
    [SerializeField] private Transform activeQuestsContainer;
    [SerializeField] private Transform completedQuestsContainer;
    [SerializeField] private GameObject questEntryPrefab;
    [SerializeField] private GameObject questDetailPanel;
    [SerializeField] private TextMeshProUGUI questTitleText;
    [SerializeField] private TextMeshProUGUI questDescriptionText;
    [SerializeField] private Transform objectivesContainer;
    [SerializeField] private GameObject objectivePrefab;
    [SerializeField] private TextMeshProUGUI rewardsText;
    
    private List<GameObject> questEntries = new List<GameObject>();
    
    public void UpdateQuestDisplay(List<Quest> quests) {
        // Clear existing entries
        ClearEntries();
        
        // Sort quests by status
        foreach (var quest in quests) {
            Transform container = quest.Status == QuestStatus.Active 
                ? activeQuestsContainer 
                : completedQuestsContainer;
            
            GameObject entry = Instantiate(questEntryPrefab, container);
            entry.GetComponent<QuestEntryUI>().Setup(quest, OnQuestSelected);
            questEntries.Add(entry);
        }
    }
    
    void ClearEntries() {
        foreach (var entry in questEntries) {
            Destroy(entry);
        }
        questEntries.Clear();
    }
    
    void OnQuestSelected(Quest quest) {
        // Show quest details
        questDetailPanel.SetActive(true);
        questTitleText.text = quest.Title;
        questDescriptionText.text = quest.Description;
        
        // Clear and populate objectives
        foreach (Transform child in objectivesContainer) {
            Destroy(child.gameObject);
        }
        
        foreach (var objective in quest.Objectives) {
            GameObject objEntry = Instantiate(objectivePrefab, objectivesContainer);
            objEntry.GetComponentInChildren<TextMeshProUGUI>().text = 
                $"{(objective.Completed ? "✓" : "○")} {objective.Description}";
        }
        
        // Show rewards
        rewardsText.text = $"Rewards: ${quest.RewardCredits}";
        foreach (var item in quest.RewardItems) {
            rewardsText.text += $"\n- {item.Name}";
        }
    }
}
```

**Shop UI:**
```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using System.Threading.Tasks;

public class ShopUI : MonoBehaviour {
    [Header("UI Components")]
    [SerializeField] private Transform assetContainer;
    [SerializeField] private GameObject assetCardPrefab;
    [SerializeField] private TMP_Text playerCreditsText;
    [SerializeField] private TMP_Dropdown categoryDropdown;
    [SerializeField] private GameObject assetDetailPanel;
    [SerializeField] private Image assetPreviewImage;
    [SerializeField] private TextMeshProUGUI assetNameText;
    [SerializeField] private TextMeshProUGUI assetDescriptionText;
    [SerializeField] private TextMeshProUGUI assetPriceText;
    [SerializeField] private Button purchaseButton;
    
    private List<Asset> currentAssets = new List<Asset>();
    private Asset selectedAsset;
    private int playerCredits;
    
    private void OnEnable() {
        categoryDropdown.onValueChanged.AddListener(OnCategoryChanged);
        purchaseButton.onClick.AddListener(OnPurchaseClicked);
    }
    
    public async void Open() {
        gameObject.SetActive(true);
        
        // Load player data
        var playerData = await NetworkManager.Instance.GetPlayerData();
        playerCredits = playerData.Credits;
        playerCreditsText.text = $"${playerCredits:N0}";
        
        // Load initial category
        await LoadCategory("vehicles");
    }
    
    async void OnCategoryChanged(int index) {
        string[] categories = { "vehicles", "clothing", "furniture", "blocks" };
        await LoadCategory(categories[index]);
    }
    
    async Task LoadCategory(string category) {
        // Clear existing
        foreach (Transform child in assetContainer) {
            Destroy(child.gameObject);
        }
        currentAssets.Clear();
        
        // Fetch from server
        var assets = await NetworkManager.Instance.GetShopAssets(category);
        currentAssets.AddRange(assets);
        
        // Create cards
        foreach (var asset in assets) {
            GameObject card = Instantiate(assetCardPrefab, assetContainer);
            card.GetComponent<AssetCard>().Setup(asset, playerCredits, OnAssetSelected);
        }
    }
    
    void OnAssetSelected(Asset asset) {
        selectedAsset = asset;
        
        // Show details
        assetDetailPanel.SetActive(true);
        assetNameText.text = asset.Name;
        assetDescriptionText.text = asset.Description;
        assetPriceText.text = $"${asset.Price:N0}";
        
        // Load preview image
        // assetPreviewImage.sprite = await LoadAssetPreview(asset.Id);
        
        // Update purchase button
        purchaseButton.interactable = playerCredits >= asset.Price;
        purchaseButton.GetComponentInChildren<TextMeshProUGUI>().text = 
            playerCredits >= asset.Price ? "Purchase" : "Insufficient Funds";
    }
    
    async void OnPurchaseClicked() {
        if (selectedAsset == null) return;
        if (playerCredits < selectedAsset.Price) return;
        
        purchaseButton.interactable = false;
        
        try {
            var result = await NetworkManager.Instance.PurchaseAsset(selectedAsset.Id);
            
            if (result.Success) {
                playerCredits = result.RemainingCredits;
                playerCreditsText.text = $"${playerCredits:N0}";
                
                NotificationManager.Instance.Show($"Purchased {selectedAsset.Name}!");
                
                // Add to inventory
                Inventory.Instance.AddItem(selectedAsset);
                
                // Close detail panel
                assetDetailPanel.SetActive(false);
                selectedAsset = null;
                
                // Refresh display
                await LoadCategory(categoryDropdown.options[categoryDropdown.value].text.ToLower());
            } else {
                NotificationManager.Instance.ShowError(result.Error);
            }
        } catch (System.Exception e) {
            NotificationManager.Instance.ShowError("Purchase failed. Please try again.");
            Debug.LogError($"Purchase error: {e.Message}");
        } finally {
            purchaseButton.interactable = true;
        }
    }
}
```

---

## Phase 5: Economy & Subscription System

[↑ Back to Top](#table-of-contents)

### 5.1 Subscription Management

```typescript
// api-gateway/src/services/subscription.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

const SUBSCRIPTION_TIERS = {
  STARTER: {
    stripePriceId: 'price_starter_50',
    price: 50,
    maxAgents: 3,
    maxWorldSize: 'small',
    features: ['basic_ai', 'quest_generation', 'building'],
    description: 'Starter Plan - Perfect for beginners'
  },
  PRO: {
    stripePriceId: 'price_pro_100',
    price: 100,
    maxAgents: 10,
    maxWorldSize: 'medium',
    features: ['advanced_ai', 'quest_generation', 'building', 'custom_characters', 'priority_support'],
    description: 'Pro Plan - For serious players'
  },
  UNLIMITED: {
    stripePriceId: 'price_unlimited_200',
    price: 200,
    maxAgents: 50,
    maxWorldSize: 'large',
    features: ['all_ai_models', 'world_customization', 'priority_processing', 'custom_quests'],
    description: 'Unlimited Plan - Ultimate experience'
  }
};

export class SubscriptionService {
  async createSubscription(userId: string, tier: string) {
    const tierConfig = SUBSCRIPTION_TIERS[tier.toUpperCase()];
    if (!tierConfig) throw new Error('Invalid tier');
    
    // Create Stripe customer if not exists
    let customerId = await this.getStripeCustomerId(userId);
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId }
      });
      customerId = customer.id;
      await this.saveStripeCustomerId(userId, customerId);
    }
    
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: tierConfig.stripePriceId }],
      metadata: { userId, tier }
    });
    
    // Update user in database
    await db.users.update(userId, {
      subscription_tier: tier.toLowerCase(),
      agent_limit: tierConfig.maxAgents,
      stripe_subscription_id: subscription.id,
      subscription_status: 'active'
    });
    
    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      tier: tier
    };
  }
  
  async cancelSubscription(userId: string) {
    const user = await db.users.findById(userId);
    if (!user.stripe_subscription_id) {
      throw new Error('No active subscription');
    }
    
    await stripe.subscriptions.cancel(user.stripe_subscription_id);
    
    await db.users.update(userId, {
      subscription_status: 'cancelled',
      subscription_tier: 'free',
      agent_limit: 0
    });
  }
  
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;
    }
  }
}
```

### 5.2 Economy Service

```typescript
// api-gateway/src/services/economy.ts
export class EconomyService {
  async completeQuest(userId: string, questId: string) {
    const quest = await db.quests.findById(questId);
    const user = await db.users.findById(userId);
    
    // Verify quest is active for this user
    const playerQuest = await db.player_quests.findOne({
      user_id: userId,
      quest_id: questId,
      status: 'active'
    });
    
    if (!playerQuest) {
      throw new Error('Quest not found or not active');
    }
    
    // Award credits
    await db.users.update(userId, {
      credits: user.credits + quest.reward_credits
    });
    
    // Award items
    for (const item of quest.reward_items) {
      await db.inventory.create({
        user_id: userId,
        item_type: item.type,
        item_id: item.id,
        quantity: item.quantity,
        metadata: item.metadata
      });
    }
    
    // Update quest status
    await db.player_quests.update(playerQuest.id, {
      status: 'completed',
      completed_at: new Date()
    });
    
    // Notify Unity client
    await websocketService.sendToUser(userId, {
      type: 'QUEST_COMPLETED',
      quest: {
        id: questId,
        title: quest.title,
        rewards: {
          credits: quest.reward_credits,
          items: quest.reward_items
        }
      },
      newCreditBalance: user.credits + quest.reward_credits
    });
    
    return {
      success: true,
      creditsAwarded: quest.reward_credits,
      itemsAwarded: quest.reward_items
    };
  }
  
  async purchaseAsset(userId: string, assetId: string) {
    const asset = await db.assets.findById(assetId);
    const user = await db.users.findById(userId);
    
    if (!asset || !asset.is_active) {
      throw new Error('Asset not found');
    }
    
    if (user.credits < asset.price) {
      throw new Error('Insufficient credits');
    }
    
    // Deduct credits
    await db.users.update(userId, {
      credits: user.credits - asset.price
    });
    
    // Add to inventory
    await db.inventory.create({
      user_id: userId,
      item_type: asset.category,
      item_id: assetId,
      quantity: 1,
      metadata: asset.metadata
    });
    
    return {
      success: true,
      remainingCredits: user.credits - asset.price,
      asset: asset
    };
  }
  
  async sellItem(userId: string, inventoryId: string, quantity: number = 1) {
    const item = await db.inventory.findById(inventoryId);
    if (!item || item.user_id !== userId) {
      throw new Error('Item not found');
    }
    
    if (item.quantity < quantity) {
      throw new Error('Insufficient quantity');
    }
    
    // Get sell price (e.g., 50% of buy price)
    const asset = await db.assets.findById(item.item_id);
    const sellPrice = Math.floor(asset.price * 0.5 * quantity);
    
    // Update inventory
    if (item.quantity === quantity) {
      await db.inventory.delete(inventoryId);
    } else {
      await db.inventory.update(inventoryId, {
        quantity: item.quantity - quantity
      });
    }
    
    // Add credits
    const user = await db.users.findById(userId);
    await db.users.update(userId, {
      credits: user.credits + sellPrice
    });
    
    return {
      success: true,
      creditsReceived: sellPrice,
      newBalance: user.credits + sellPrice
    };
  }
}
```

---

## Phase 6: Deployment & Scaling

[↑ Back to Top](#table-of-contents)

### 6.1 Docker Configuration

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  # Unity WebGL build served via nginx
  unity-client:
    build:
      context: ./unity-client
      dockerfile: Dockerfile.webgl
    ports:
      - "8080:80"
    environment:
      - API_URL=wss://api.yourgame.com
  
  # API Gateway
  api-gateway:
    build:
      context: ./api-gateway
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - REDIS_URL=redis://redis:6379
      - DB_URL=postgresql://postgres:5432/game
      - TEMPORAL_HOST=temporal:7233
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
      - postgres
      - temporal
  
  # Temporal Server
  temporal:
    image: temporalio/auto-setup:latest
    ports:
      - "7233:7233"
      - "8088:8088"  # Web UI
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgres
      - DYNAMIC_CONFIG_FILE_PATH=config/dynamicconfig/development-sql.yaml
  
  # Temporal Worker (TypeScript workflows)
  temporal-worker:
    build:
      context: ./temporal-workflows
      dockerfile: Dockerfile
    environment:
      - TEMPORAL_HOST=temporal:7233
      - AI_WORKER_URL=http://ai-workers:8000
    depends_on:
      - temporal
    deploy:
      replicas: 2
  
  # AI Workers (Python)
  ai-workers:
    build:
      context: ./ai-workers
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PINECONE_API_KEY=${PINECONE_API_KEY}
      - PINECONE_INDEX=game-memories
      - DB_URL=postgresql://postgres:5432/game
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
  
  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
  
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=game
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
  
  # Vector Database (Milvus)
  milvus:
    image: milvusdb/milvus:latest
    ports:
      - "19530:19530"
    environment:
      - ETCD_ENDPOINTS=etcd:2379
      - MINIO_ADDRESS=minio:9000
  
  etcd:
    image: quay.io/coreos/etcd:v3.5.5
  
  minio:
    image: minio/minio:latest
    command: server /data
    volumes:
      - minio_data:/data

volumes:
  redis_data:
  postgres_data:
  minio_data:
```

### 6.2 Kubernetes Configuration

**k8s/api-gateway.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: your-registry/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

**k8s/ai-workers.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-workers
spec:
  replicas: 5
  selector:
    matchLabels:
      app: ai-workers
  template:
    metadata:
      labels:
        app: ai-workers
    spec:
      containers:
      - name: ai-workers
        image: your-registry/ai-workers:latest
        ports:
        - containerPort: 8000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: openai-api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-workers-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-workers
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: temporal_queue_depth
        selector:
          matchLabels:
            queue: ai-character-tasks
      target:
        type: AverageValue
        averageValue: "10"
```

### 6.3 Steam Integration

**Unity Steam Manager:**
```csharp
#if UNITY_STANDALONE
using Steamworks;
using UnityEngine;

public class SteamManager : MonoBehaviour {
    protected static bool s_EverInitialized = false;
    protected static SteamManager s_Instance;
    
    public static SteamManager Instance {
        get { return s_Instance; }
    }
    
    protected virtual void Awake() {
        if (s_Instance != null) {
            Destroy(gameObject);
            return;
        }
        s_Instance = this;
        
        if (!Packsize.Test()) {
            Debug.LogError("[Steamworks.NET] Packsize Test returned false!");
            Destroy(gameObject);
            return;
        }
        
        if (!DllCheck.Test()) {
            Debug.LogError("[Steamworks.NET] DllCheck Test returned false!");
            Destroy(gameObject);
            return;
        }
        
        try {
            if (SteamAPI.RestartAppIfNecessary((AppId_t)480)) { // Replace with your App ID
                Application.Quit();
                return;
            }
        } catch (System.DllNotFoundException e) {
            Debug.LogError(e);
            Destroy(gameObject);
            return;
        }
        
        s_EverInitialized = SteamAPI.Init();
        if (!s_EverInitialized) {
            Debug.LogError("[Steamworks.NET] SteamAPI_Init() failed.");
            Destroy(gameObject);
            return;
        }
        
        DontDestroyOnLoad(gameObject);
    }
    
    protected virtual void OnEnable() {
        if (s_Instance == null) {
            s_Instance = this;
        }
    }
    
    protected virtual void Update() {
        SteamAPI.RunCallbacks();
    }
    
    protected virtual void OnDestroy() {
        if (s_Instance != this) {
            return;
        }
        
        s_Instance = null;
        
        if (s_EverInitialized) {
            SteamAPI.Shutdown();
        }
    }
    
    public static string GetSteamId() {
        return SteamUser.GetSteamID().ToString();
    }
    
    public static string GetPlayerName() {
        return SteamFriends.GetPersonaName();
    }
    
    public static void UnlockAchievement(string achievementId) {
        SteamUserStats.SetAchievement(achievementId);
        SteamUserStats.StoreStats();
    }
}
#endif
```

**Backend Steam Authentication:**
```typescript
// api-gateway/src/routes/auth.ts
import { Router } from 'express';
import SteamAuth from 'node-steam-openid';
import jwt from 'jsonwebtoken';

const router = Router();

const steam = new SteamAuth({
  realm: 'https://yourgame.com',
  returnUrl: 'https://yourgame.com/auth/steam/authenticate',
  apiKey: process.env.STEAM_API_KEY
});

router.get('/steam', async (req, res) => {
  const redirectUrl = await steam.getRedirectUrl();
  res.redirect(redirectUrl);
});

router.get('/steam/authenticate', async (req, res) => {
  try {
    const user = await steam.authenticate(req);
    
    // Find or create user
    let dbUser = await db.users.findOne({ steam_id: user.steamid });
    
    if (!dbUser) {
      dbUser = await db.users.create({
        steam_id: user.steamid,
        username: user.username,
        subscription_tier: 'free',
        agent_limit: 0,
        credits: 0
      });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { 
        userId: dbUser.id,
        steamId: user.steamid,
        tier: dbUser.subscription_tier 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Redirect to Unity with token
    res.redirect(`unity://auth?token=${token}`);
    
  } catch (error) {
    console.error('Steam auth error:', error);
    res.redirect('/auth/error');
  }
});

export default router;
```

---

## Cost Analysis & Optimization

[↑ Back to Top](#table-of-contents)

### LLM Cost Estimates

**Per-User Monthly Costs (based on usage patterns):**

| Component | Usage | Cost per Unit | Monthly Cost |
|-----------|-------|---------------|--------------|
| Character Chat (GPT-3.5) | 3 chars × 20 msgs/day × 30 days = 1,800 msgs | $0.002/msg | $3.60 |
| Character Chat (GPT-4 for complex) | 10% of chats = 180 msgs | $0.03/msg | $5.40 |
| Memory Embeddings | 100 memories/user | $0.0001/embedding | $0.01 |
| Memory Retrieval | 5 searches/chat × 1,800 chats | $0.0001/search | $0.90 |
| Quest Generation (GPT-4) | 30 quests/month | $0.05/quest | $1.50 |
| Narrative Director | 720 evaluations/month | $0.01/eval | $7.20 |
| **Total per user** | | | **~$18.61** |

### Infrastructure Cost Estimates

**Fixed Monthly Costs (Base Infrastructure):**

| Component | Service | Monthly Cost | Notes |
|-----------|---------|--------------|-------|
| **Kubernetes Cluster** | AWS EKS / GKE | $150-300 | Control plane + 3-5 nodes (t3.medium/t3.large) |
| **Load Balancers** | AWS ALB / GCP LB | $50-100 | 2-3 load balancers for API + WebSocket |
| **PostgreSQL** | AWS RDS / GCP Cloud SQL | $100-200 | db.t3.medium with Multi-AZ |
| **Redis** | AWS ElastiCache / Redis Cloud | $50-100 | Cache.t3.micro to small |
| **Vector Database** | Pinecone (Standard) | $70-200 | Based on 1M vectors, 10M queries/month |
| **Object Storage** | S3 / GCS | $20-50 | World saves, assets, backups |
| **Monitoring** | Datadog / New Relic | $100-300 | APM, logs, infrastructure monitoring |
| **Temporal** | Self-hosted / Temporal Cloud | $0-200 | Self-hosted on K8s vs managed |
| **CDN** | CloudFront / CloudFlare | $30-100 | Asset delivery, global latency |
| **CI/CD** | GitHub Actions / GitLab | $20-50 | Build minutes, runners |
| **Domain & DNS** | Route53 / CloudFlare | $10-20 | Domain registration, DNS queries |
| **SSL Certificates** | Let's Encrypt / AWS ACM | $0-30 | Free LE or paid wildcard certs |
| **Backup Storage** | S3 Glacier / GCS Coldline | $20-50 | Automated DB and world backups |
| **Development Tools** | Various | $50-100 | Unity Pro (if needed), IDEs, testing tools |
| **Fixed Subtotal** | | **$670-1,700** | **~$1,200 average** |

**Variable Per-User Infrastructure Costs:**

| Component | Unit | Cost per Unit | Per User/Month |
|-----------|------|---------------|----------------|
| **Compute (API Gateway)** | 1000 requests | $0.005 | ~$0.15 (30K requests/user) |
| **Compute (AI Workers)** | vCPU-hour | $0.05 | ~$2.00 (40 hrs processing) |
| **Bandwidth (Outbound)** | GB | $0.09 | ~$1.80 (20 GB/user) |
| **Storage (User Data)** | GB | $0.023 | ~$0.50 (20 GB worlds + assets) |
| **WebSocket Connections** | Connection-hour | $0.0001 | ~$0.15 (150 hrs online) |
| **Variable Subtotal** | | | **~$4.60/user/month** |

**Total Infrastructure Cost Breakdown:**

| Users | Fixed Costs | Variable Costs | Total Infra | Per User |
|-------|-------------|----------------|-------------|----------|
| 100 | $1,200 | $460 | $1,660 | **$16.60** |
| 500 | $1,200 | $2,300 | $3,500 | **$7.00** |
| 1,000 | $1,500 | $4,600 | $6,100 | **$6.10** |
| 5,000 | $2,500 | $23,000 | $25,500 | **$5.10** |
| 10,000 | $4,000 | $46,000 | $50,000 | **$5.00** |

*Note: Fixed costs scale up at higher user counts due to need for larger clusters, more DB capacity, etc.*

### Complete Cost Analysis (LLM + Infrastructure)

**Per-User Total Cost by Tier (at 1,000 user scale):**

| Tier | Subscription | LLM Cost | Infra Cost | **Total Cost** | **Margin** |
|------|--------------|----------|------------|----------------|------------|
| **Starter** | $50 | $18.61 | $6.10 | **$24.71** | **51%** |
| **Pro** | $100 | $62.03 | $6.10 | **$68.13** | **32%** |
| **Unlimited** | $200 | $310.17 | $6.10 | **$316.27** | **-58%** |

**At 5,000 user scale (economies of scale):**

| Tier | Subscription | LLM Cost | Infra Cost | **Total Cost** | **Margin** |
|------|--------------|----------|------------|----------------|------------|
| **Starter** | $50 | $18.61 | $5.10 | **$23.71** | **53%** |
| **Pro** | $100 | $62.03 | $5.10 | **$67.13** | **33%** |
| **Unlimited** | $200 | $310.17 | $5.10 | **$315.27** | **-58%** |

### Break-Even Analysis

**Monthly Revenue Required to Break Even:**

| Users | Fixed Infra | Variable Infra | Total LLM* | **Total Cost** | Avg Revenue/User Needed |
|-------|-------------|----------------|------------|----------------|------------------------|
| 100 | $1,200 | $460 | $1,861 | **$3,521** | **$35.21** |
| 500 | $1,200 | $2,300 | $9,305 | **$12,805** | **$25.61** |
| 1,000 | $1,500 | $4,600 | $18,610 | **$24,710** | **$24.71** |
| 5,000 | $2,500 | $23,000 | $93,050 | **$118,550** | **$23.71** |

*Assumes 50% Starter, 40% Pro, 10% Unlimited distribution*

**Key Insights:**
- **Minimum viable price**: $25-35/user at small scale (100-500 users)
- **Profitable at scale**: With 1,000+ users, $50 Starter tier becomes profitable
- **Unlimited tier is loss-making**: Requires either:
  - Usage caps (e.g., max 15 msgs/char/day)
  - Local LLM fallback (70% of queries)
  - Higher price point ($350-400)
  - Tier as "marketing loss leader" to attract Pro upgrades

### Cost Optimization Strategies

#### 1. LLM Cost Reduction
- **Caching Layer**: Cache common NPC responses (greetings, directions)
  - Use Redis for response caching with 1-hour TTL
  - Expected savings: 30-40% on common interactions
  - *Savings: ~$5-7/user/month*

- **Model Tiering**: 
  - GPT-4: Only for Narrative Director and complex decisions (10%)
  - GPT-3.5-turbo: Standard character interactions (80%)
  - Local LLM (Llama 3 8B): Simple responses, offline mode (10%)
  - *Savings: ~$3-5/user/month*

- **Batching**: 
  - Batch multiple character updates into single LLM call
  - Process offline characters in batches
  - Expected savings: 20-25% on API calls
  - *Savings: ~$3-4/user/month*

#### 2. Infrastructure Cost Reduction
- **Spot Instances**: Use AWS/GCP spot instances for AI workers (50-70% savings)
  - *Savings: ~$1-2/user/month*

- **Reserved Instances**: Commit to 1-year reserved instances for base infrastructure
  - *Savings: 30-40% on compute (~$400-600/month fixed)*

- **CDN Optimization**: 
  - Compress assets aggressively
  - Use CloudFlare free tier initially
  - *Savings: $50-100/month*

- **Self-Hosted Options**:
  - Self-host Temporal instead of Temporal Cloud
  - Self-host Milvus instead of Pinecone
  - *Savings: $200-400/month fixed*

#### 3. Architecture Optimizations
- **Memory Pruning**:
  - Compress conversations older than 7 days
  - Archive memories with importance < 0.3 after 30 days
  - Reduce vector DB costs
  - *Savings: ~$0.50/user/month*

- **Predictive Loading**:
  - Pre-generate likely dialogue options
  - Cache quest templates
  - Reduce real-time generation needs
  - *Savings: ~$2-3/user/month*

**Total Potential Savings**: $15-25/user/month (40-60% reduction)

**Optimized Costs at 1,000 Users:**
- Starter tier: $24.71 → $12-15 cost = **70-76% margin** ✓
- Pro tier: $68.13 → $35-40 cost = **60-65% margin** ✓
- Unlimited tier: $316.27 → $180-200 cost = **0-10% margin** (manageable with caps)

### Recommendations

1. **Start with Starter tier only** at $50/month
   - Proven profitable even at small scale
   - Build user base before adding complexity

2. **Add Pro tier at $100/month** after 500+ users
   - Good margin with optimizations
   - Natural upgrade path

3. **Delay Unlimited tier** until:
   - 2,000+ users (better infrastructure efficiency)
   - Local LLM integration complete
   - Usage caps implemented
   - OR price at $300-350 with clear value proposition

4. **Monitor these metrics monthly:**
   - LLM cost per active user
   - Infrastructure cost per user (target: <$6)
   - Cache hit rate (target: >30%)
   - Average messages per character per day
   - User retention by tier

---

## Implementation Roadmap

[↑ Back to Top](#table-of-contents)

### Phase 1: Foundation (Weeks 1-3)
- [ ] Set up Unity project with URP
- [ ] Create basic player controller and camera
- [ ] Implement WebSocket client
- [ ] Set up Node.js API gateway
- [ ] Configure PostgreSQL and Redis
- [ ] Deploy Temporal server
- [ ] Basic authentication system

**Deliverable:** Local multiplayer prototype with chat

### Phase 2: AI Core (Weeks 4-6)
- [ ] Implement DSPy character agents
- [ ] Build memory management system
- [ ] Create Narrative Director
- [ ] Set up Temporal workflows
- [ ] Implement vector database (Milvus)
- [ ] Character dialogue system
- [ ] Memory decay and consolidation

**Deliverable:** AI characters with persistent memory

### Phase 3: Game Systems (Weeks 7-10)
- [ ] Building/crafting system (Minecraft-style)
- [ ] Inventory management
- [ ] Quest system UI
- [ ] Character interaction UI
- [ ] World persistence
- [ ] Economy basics

**Deliverable:** Playable world with AI NPCs and building

### Phase 4: Economy & Progression (Weeks 11-12)
- [ ] Quest generation and management
- [ ] Credit system
- [ ] Shop and assets
- [ ] Subscription tiers
- [ ] Stripe integration
- [ ] Progression systems

**Deliverable:** Full game loop with monetization

### Phase 5: Polish & Deployment (Weeks 13-14)
- [ ] Steam integration
- [ ] Performance optimization
- [ ] Bug fixing
- [ ] Kubernetes deployment
- [ ] Monitoring and logging
- [ ] Beta testing setup

**Deliverable:** Steam-ready beta

### Phase 6: Launch (Week 15+)
- [ ] Soft launch with limited users
- [ ] Monitor costs and performance
- [ ] Gather feedback
- [ ] Iterate on AI behaviors
- [ ] Scale infrastructure
- [ ] Full Steam launch

---

## Technical Considerations

[↑ Back to Top](#table-of-contents)

### Performance Targets
- **Unity Client:** 60 FPS on mid-tier hardware (GTX 1060 / RX 580)
- **API Response Time:** <100ms for non-AI endpoints
- **AI Response Time:** <3 seconds average, <5 seconds worst case
- **Concurrent Users:** Support 1,000 CCU per server instance
- **Memory Usage:** <2GB per AI worker

### Security Measures
- JWT-based authentication
- Rate limiting per user (100 requests/minute)
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- WebSocket connection limits per IP
- CORS configuration
- Stripe webhook signature verification

### Monitoring & Observability
- Prometheus + Grafana for metrics
- Distributed tracing with Jaeger
- Error tracking with Sentry
- LLM cost tracking per user
- AI response quality monitoring
- Player behavior analytics

---

## Development Process & TDD

[↑ Back to Top](#table-of-contents)

### Test-Driven Development (TDD) Workflow

All development must follow strict TDD principles. **No feature code should be written before tests are defined and failing.**

#### Feature Development Lifecycle

```
1. SPEC → 2. TESTS → 3. IMPLEMENT → 4. REFACTOR → 5. REVIEW
```

**Phase 1: Specification (Before any code)**
- Create feature specification document
- Define acceptance criteria
- Document all edge cases and error scenarios
- Get spec reviewed and approved

**Phase 2: Test Cases (Red Phase)**
- Write all test cases based on spec
- Tests should fail (no implementation yet)
- Include: unit tests, integration tests, e2e tests
- Minimum 80% code coverage required

**Phase 3: Implementation (Green Phase)**
- Write minimum code to make tests pass
- No premature optimization
- Focus on correctness over performance

**Phase 4: Refactor**
- Improve code quality while keeping tests green
- Optimize for readability and maintainability
- Extract patterns, remove duplication

**Phase 5: Review**
- Code review with test coverage report
- Verify all acceptance criteria met
- Update documentation

### Feature Specification Template

Every feature must start with a spec document:

```markdown
# Feature: [Feature Name]

## Overview
Brief description of what this feature does and why it exists.

## Acceptance Criteria
- [ ] Criterion 1: Specific, measurable, testable requirement
- [ ] Criterion 2: Another requirement
- [ ] Criterion 3: Edge case handling

## Technical Requirements
- API endpoints needed
- Database schema changes
- Third-party integrations
- Performance requirements

## Test Cases

### Unit Tests
1. **Test**: [Test name]
   - **Input**: [Specific input]
   - **Expected Output**: [Expected result]
   - **Edge Cases**: [Special scenarios]

2. **Test**: [Another test]
   ...

### Integration Tests
1. **Test**: [Integration scenario]
   - **Setup**: [Required state]
   - **Action**: [User/system action]
   - **Expected**: [System response]

### E2E Tests
1. **Test**: [Full user journey]
   - **Given**: [Starting state]
   - **When**: [User actions]
   - **Then**: [Expected outcomes]

## Error Scenarios
- Error 1: [What happens when X fails]
- Error 2: [Invalid input handling]
- Error 3: [Timeout/degradation scenarios]

## Dependencies
- Other features required
- External services
- Blockers

## Estimation
- **Complexity**: Low/Medium/High
- **Estimated Hours**: X hours
- **Sprint**: Sprint Y
```

### Testing Requirements by Component

#### Unity (C#)
- **Unit Tests**: NUnit + Unity Test Framework
  - Test all public methods
  - Mock external dependencies
  - Test edge cases and error paths

- **Integration Tests**: Unity Test Runner
  - Test component interactions
  - Test scene loading/unloading
  - Test save/load systems

- **Play Mode Tests**: Unity Test Framework
  - Test gameplay mechanics
  - Test UI interactions
  - Test AI behavior in scenes

**Example Test Structure:**
```csharp
[TestFixture]
public class BuildingSystemTests
{
    [Test]
    public void PlaceBlock_ValidPosition_BlockIsCreated()
    {
        // Arrange
        var system = new BuildingSystem();
        var position = new Vector3(1, 0, 1);
        
        // Act
        var result = system.PlaceBlock(position, blockType: 1);
        
        // Assert
        Assert.IsTrue(result.Success);
        Assert.IsNotNull(result.Block);
        Assert.AreEqual(position, result.Block.Position);
    }
    
    [Test]
    public void PlaceBlock_OccupiedPosition_ReturnsError()
    {
        // Arrange
        var system = new BuildingSystem();
        var position = new Vector3(1, 0, 1);
        system.PlaceBlock(position, blockType: 1); // First block
        
        // Act
        var result = system.PlaceBlock(position, blockType: 2); // Try to place on top
        
        // Assert
        Assert.IsFalse(result.Success);
        Assert.AreEqual(ErrorCode.PositionOccupied, result.Error);
    }
}
```

#### Node.js API
- **Unit Tests**: Jest
  - Test all route handlers
  - Test middleware
  - Test service layer logic

- **Integration Tests**: Jest + Supertest
  - Test API endpoints
  - Test database interactions
  - Test WebSocket events

- **Contract Tests**: Pact
  - Verify API contracts with Unity client
  - Prevent breaking changes

**Example Test Structure:**
```typescript
describe('CharacterController', () => {
  describe('POST /api/characters/:id/chat', () => {
    it('should enqueue AI workflow and return job ID', async () => {
      // Arrange
      const characterId = 'char-123';
      const message = 'Hello!';
      
      // Act
      const response = await request(app)
        .post(`/api/characters/${characterId}/chat`)
        .send({ message })
        .set('Authorization', `Bearer ${token}`);
      
      // Assert
      expect(response.status).toBe(202);
      expect(response.body.jobId).toBeDefined();
      expect(mockTemporalClient.workflow.start).toHaveBeenCalled();
    });
    
    it('should return 429 when rate limit exceeded', async () => {
      // Test rate limiting
    });
  });
});
```

#### Python AI Workers
- **Unit Tests**: pytest
  - Test DSPy signatures
  - Test memory operations
  - Test LLM integrations

- **Integration Tests**: pytest
  - Test full AI pipeline
  - Test vector database queries
  - Test Temporal activities

**Example Test Structure:**
```python
class TestCharacterAgent:
    async def test_process_interaction_returns_response(self):
        # Arrange
        agent = CharacterAgent(mock_llm, mock_memory)
        context = CharacterContext(
            character_id="char-1",
            name="Farmer Bob",
            personality_traits=["friendly", "hardworking"]
        )
        
        # Act
        result = await agent.process_interaction(
            context=context,
            observation=mock_observation,
            player_message="Hello!",
            player_context={}
        )
        
        # Assert
        assert "response_text" in result
        assert result["emotional_shift"] >= -1.0
        assert result["emotional_shift"] <= 1.0
    
    async def test_memory_stored_when_importance_high(self):
        # Test that important memories are persisted
```

### Test Coverage Requirements

| Component | Minimum Coverage | Target Coverage |
|-----------|------------------|-----------------|
| Unity C# | 70% | 85% |
| Node.js API | 80% | 90% |
| Python AI Workers | 75% | 85% |
| **Overall** | **75%** | **85%** |

### CI/CD Integration

**Pre-commit Hooks:**
- Run unit tests on staged files
- Lint check (ESLint, pylint, dotnet format)
- Type checking (TypeScript, mypy)

**Pull Request Checks:**
- Full test suite must pass
- Coverage must not decrease
- Static analysis (SonarQube)
- Security scan (Snyk)

**Main Branch Deployment:**
- Integration tests run
- E2E tests run
- Performance benchmarks
- Deploy to staging

### Testing Tools & Frameworks

**Unity:**
- Unity Test Framework (Edit Mode + Play Mode)
- NUnit for unit tests
- Moq for mocking
- Code Coverage package

**Node.js:**
- Jest (test runner)
- Supertest (HTTP assertions)
- nock (HTTP mocking)
- jest-websocket-mock

**Python:**
- pytest
- pytest-asyncio
- pytest-cov (coverage)
- responses (HTTP mocking)
- moto (AWS mocking)

**E2E:**
- Playwright (Unity WebGL tests)
- Cypress (Admin dashboard)
- k6 (Load testing)

### Definition of Done

A feature is **DONE** when:
- [ ] Spec document approved
- [ ] All test cases written and passing
- [ ] Code coverage meets minimum threshold
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No critical or high bugs
- [ ] Performance benchmarks met
- [ ] Deployed to staging and tested
- [ ] Monitoring/alerting configured

---

## Next Steps

[↑ Back to Top](#table-of-contents)

1. **Validate Architecture:** Review and adjust based on your feedback
2. **Prototype:** Build minimal viable version (Phase 1)
3. **Test AI Quality:** Evaluate DSPy agent responses
4. **Cost Validation:** Run small-scale test to validate cost estimates
5. **Iterate:** Refine based on testing results

**Ready to start implementing? Which phase would you like to begin with?**
