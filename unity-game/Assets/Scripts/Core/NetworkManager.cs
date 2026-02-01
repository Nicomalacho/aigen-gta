using UnityEngine;
using System;
using System.Collections.Generic;
using WebSocketSharp;
using Newtonsoft.Json;

public class NetworkManager : MonoBehaviour
{
    [Header("Connection Settings")]
    [SerializeField] public string serverUrl = "ws://localhost:3000";
    [SerializeField] private float reconnectDelay = 5f;
    [SerializeField] private int maxReconnectAttempts = 5;

    // Events
    public event Action<ConnectionState> OnConnectionStateChanged;
    public event Action<string> OnError;
    public event Action<BaseMessage> OnMessageReceived;
    public event Action OnConnected;
    public event Action OnDisconnected;

    // State
    private WebSocket ws;
    private ConnectionState currentState = ConnectionState.Disconnected;
    private string authToken;
    private int reconnectAttempts = 0;
    private bool isReconnecting = false;

    // Message queue for offline mode
    private Queue<BaseMessage> messageQueue = new Queue<BaseMessage>();

    // Singleton pattern
    public static NetworkManager Instance { get; private set; }

    public bool IsConnected => currentState == ConnectionState.Connected;
    public ConnectionState CurrentState => currentState;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void OnDestroy()
    {
        Disconnect();
    }

    public void Connect(string token)
    {
        if (currentState == ConnectionState.Connected || currentState == ConnectionState.Connecting)
        {
            Debug.LogWarning("Already connected or connecting");
            return;
        }

        authToken = token;
        SetConnectionState(ConnectionState.Connecting);

        try
        {
            ws = new WebSocket(serverUrl);
            
            // Set auth header
            ws.SetCredentials("Bearer " + token, "", true);
            
            // Subscribe to events
            ws.OnOpen += OnWebSocketOpen;
            ws.OnMessage += OnWebSocketMessage;
            ws.OnError += OnWebSocketError;
            ws.OnClose += OnWebSocketClose;

            // Connect
            ws.ConnectAsync();
        }
        catch (Exception ex)
        {
            Debug.LogError($"Failed to create WebSocket: {ex.Message}");
            SetConnectionState(ConnectionState.Error);
            OnError?.Invoke($"Connection failed: {ex.Message}");
        }
    }

    public void Disconnect()
    {
        if (ws != null)
        {
            ws.OnOpen -= OnWebSocketOpen;
            ws.OnMessage -= OnWebSocketMessage;
            ws.OnError -= OnWebSocketError;
            ws.OnClose -= OnWebSocketClose;

            if (ws.ReadyState == WebSocketState.Open)
            {
                ws.CloseAsync();
            }

            ws = null;
        }

        SetConnectionState(ConnectionState.Disconnected);
        reconnectAttempts = 0;
        isReconnecting = false;
    }

    public void SendMessage(BaseMessage message, Action<bool> callback = null)
    {
        if (!IsConnected)
        {
            Debug.LogWarning("Not connected, queuing message");
            messageQueue.Enqueue(message);
            callback?.Invoke(false);
            return;
        }

        try
        {
            string json = JsonConvert.SerializeObject(message);
            ws.SendAsync(json, (success) =>
            {
                if (!success)
                {
                    Debug.LogError("Failed to send message");
                }
                callback?.Invoke(success);
            });
        }
        catch (Exception ex)
        {
            Debug.LogError($"Error sending message: {ex.Message}");
            callback?.Invoke(false);
        }
    }

    private void OnWebSocketOpen(object sender, EventArgs e)
    {
        Debug.Log("WebSocket connected");
        SetConnectionState(ConnectionState.Connected);
        reconnectAttempts = 0;
        isReconnecting = false;
        OnConnected?.Invoke();

        // Send any queued messages
        ProcessMessageQueue();
    }

    private void OnWebSocketMessage(object sender, MessageEventArgs e)
    {
        try
        {
            Debug.Log($"Received message: {e.Data}");
            
            var baseMessage = JsonConvert.DeserializeObject<BaseMessage>(e.Data);
            
            if (baseMessage != null)
            {
                // Handle specific message types
                switch (baseMessage.type)
                {
                    case MessageType.AUTH_SUCCESS:
                        var authMessage = JsonConvert.DeserializeObject<AuthSuccessMessage>(e.Data);
                        Debug.Log($"Authentication successful for user: {authMessage?.userId}");
                        break;
                        
                    case MessageType.CHARACTER_RESPONSE:
                        var responseMessage = JsonConvert.DeserializeObject<CharacterResponseMessage>(e.Data);
                        OnMessageReceived?.Invoke(responseMessage);
                        break;
                        
                    case MessageType.ERROR:
                        var errorMessage = JsonConvert.DeserializeObject<ErrorMessage>(e.Data);
                        Debug.LogError($"Server error: {errorMessage?.error}");
                        OnError?.Invoke(errorMessage?.error);
                        break;
                        
                    default:
                        OnMessageReceived?.Invoke(baseMessage);
                        break;
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"Error parsing message: {ex.Message}");
        }
    }

    private void OnWebSocketError(object sender, ErrorEventArgs e)
    {
        Debug.LogError($"WebSocket error: {e.Message}");
        OnError?.Invoke(e.Message);
        
        if (!IsConnected)
        {
            SetConnectionState(ConnectionState.Error);
        }
    }

    private void OnWebSocketClose(object sender, CloseEventArgs e)
    {
        Debug.Log($"WebSocket closed: {e.Reason} (Code: {e.Code})");
        
        if (IsConnected)
        {
            SetConnectionState(ConnectionState.Disconnected);
            OnDisconnected?.Invoke();
            
            // Attempt reconnection if not intentionally disconnected
            if (!isReconnecting && reconnectAttempts < maxReconnectAttempts)
            {
                AttemptReconnection();
            }
        }
    }

    private void AttemptReconnection()
    {
        isReconnecting = true;
        reconnectAttempts++;
        
        Debug.Log($"Attempting reconnection ({reconnectAttempts}/{maxReconnectAttempts})...");
        SetConnectionState(ConnectionState.Reconnecting);
        
        Invoke(nameof(Reconnect), reconnectDelay);
    }

    private void Reconnect()
    {
        if (authToken != null)
        {
            Connect(authToken);
        }
    }

    private void ProcessMessageQueue()
    {
        while (messageQueue.Count > 0 && IsConnected)
        {
            var message = messageQueue.Dequeue();
            SendMessage(message);
        }
    }

    private void SetConnectionState(ConnectionState newState)
    {
        if (currentState != newState)
        {
            currentState = newState;
            Debug.Log($"Connection state changed to: {newState}");
            OnConnectionStateChanged?.Invoke(newState);
        }
    }
}

// Enums
public enum ConnectionState
{
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Error
}

public enum MessageType
{
    AUTH,
    AUTH_SUCCESS,
    AUTH_FAILURE,
    PING,
    PONG,
    CHARACTER_CHAT,
    CHARACTER_RESPONSE,
    ERROR
}

// Message classes
[Serializable]
public class BaseMessage
{
    public MessageType type;
    public string timestamp;
    public string messageId;
}

[Serializable]
public class CharacterChatMessage : BaseMessage
{
    public string characterId;
    public string message;
    public string playerContext;
}

[Serializable]
public class CharacterResponseMessage : BaseMessage
{
    public string characterId;
    public string response;
    public float emotionalShift;
    public string action;
}

[Serializable]
public class AuthSuccessMessage : BaseMessage
{
    public string userId;
    public bool connected;
}

[Serializable]
public class ErrorMessage : BaseMessage
{
    public string error;
    public string code;
}
