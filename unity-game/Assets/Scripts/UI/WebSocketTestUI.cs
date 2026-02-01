using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class WebSocketTestUI : MonoBehaviour
{
    [Header("UI Components")]
    [SerializeField] private TMP_InputField tokenInput;
    [SerializeField] private TMP_InputField messageInput;
    [SerializeField] private Button connectButton;
    [SerializeField] private Button disconnectButton;
    [SerializeField] private Button sendButton;
    [SerializeField] private TextMeshProUGUI statusText;
    [SerializeField] private TextMeshProUGUI logText;
    [SerializeField] private ScrollRect logScrollRect;

    [Header("Settings")]
    [SerializeField] private string serverUrl = "ws://localhost:3000";

    private void Start()
    {
        // Setup UI
        connectButton.onClick.AddListener(OnConnectClicked);
        disconnectButton.onClick.AddListener(OnDisconnectClicked);
        sendButton.onClick.AddListener(OnSendClicked);

        // Setup NetworkManager
        NetworkManager.Instance.serverUrl = serverUrl;
        NetworkManager.Instance.OnConnectionStateChanged += OnConnectionStateChanged;
        NetworkManager.Instance.OnConnected += OnConnected;
        NetworkManager.Instance.OnDisconnected += OnDisconnected;
        NetworkManager.Instance.OnMessageReceived += OnMessageReceived;
        NetworkManager.Instance.OnError += OnError;

        UpdateUIState();
        Log("WebSocket Test UI initialized. Ready to connect.");
    }

    private void OnDestroy()
    {
        // Unsubscribe from events
        if (NetworkManager.Instance != null)
        {
            NetworkManager.Instance.OnConnectionStateChanged -= OnConnectionStateChanged;
            NetworkManager.Instance.OnConnected -= OnConnected;
            NetworkManager.Instance.OnDisconnected -= OnDisconnected;
            NetworkManager.Instance.OnMessageReceived -= OnMessageReceived;
            NetworkManager.Instance.OnError -= OnError;
        }

        // Remove button listeners
        connectButton.onClick.RemoveListener(OnConnectClicked);
        disconnectButton.onClick.RemoveListener(OnDisconnectClicked);
        sendButton.onClick.RemoveListener(OnSendClicked);
    }

    private void OnConnectClicked()
    {
        string token = tokenInput.text.Trim();
        if (string.IsNullOrEmpty(token))
        {
            Log("Error: Please enter a JWT token");
            return;
        }

        Log($"Connecting to {serverUrl}...");
        NetworkManager.Instance.Connect(token);
    }

    private void OnDisconnectClicked()
    {
        Log("Disconnecting...");
        NetworkManager.Instance.Disconnect();
    }

    private void OnSendClicked()
    {
        if (!NetworkManager.Instance.IsConnected)
        {
            Log("Error: Not connected");
            return;
        }

        string messageText = messageInput.text.Trim();
        if (string.IsNullOrEmpty(messageText))
        {
            Log("Error: Please enter a message");
            return;
        }

        var message = new CharacterChatMessage
        {
            type = MessageType.CHARACTER_CHAT,
            characterId = "test-char-001",
            message = messageText
        };

        Log($"Sending: {messageText}");
        
        NetworkManager.Instance.SendMessage(message, (success) => {
            if (success)
            {
                Log("Message sent successfully");
            }
            else
            {
                Log("Failed to send message");
            }
        });

        messageInput.text = "";
    }

    private void OnConnectionStateChanged(ConnectionState state)
    {
        Log($"Connection state: {state}");
        UpdateUIState();
    }

    private void OnConnected()
    {
        Log("Connected to server!");
        UpdateUIState();
    }

    private void OnDisconnected()
    {
        Log("Disconnected from server");
        UpdateUIState();
    }

    private void OnMessageReceived(BaseMessage message)
    {
        if (message is CharacterResponseMessage response)
        {
            Log($"Received from {response.characterId}: {response.response}");
        }
        else if (message is AuthSuccessMessage auth)
        {
            Log($"Auth success for user: {auth.userId}");
        }
        else
        {
            Log($"Received message: {message.type}");
        }
    }

    private void OnError(string error)
    {
        Log($"Error: {error}");
    }

    private void UpdateUIState()
    {
        bool isConnected = NetworkManager.Instance.IsConnected;
        ConnectionState state = NetworkManager.Instance.CurrentState;

        connectButton.interactable = !isConnected && state != ConnectionState.Connecting;
        disconnectButton.interactable = isConnected;
        sendButton.interactable = isConnected;
        tokenInput.interactable = !isConnected;

        statusText.text = $"Status: {state}";
        
        switch (state)
        {
            case ConnectionState.Connected:
                statusText.color = Color.green;
                break;
            case ConnectionState.Connecting:
            case ConnectionState.Reconnecting:
                statusText.color = Color.yellow;
                break;
            case ConnectionState.Error:
                statusText.color = Color.red;
                break;
            default:
                statusText.color = Color.white;
                break;
        }
    }

    private void Log(string message)
    {
        string timestamp = System.DateTime.Now.ToString("HH:mm:ss");
        string logEntry = $"[{timestamp}] {message}\n";
        
        logText.text += logEntry;
        
        // Auto-scroll to bottom
        Canvas.ForceUpdateCanvases();
        logScrollRect.verticalNormalizedPosition = 0f;
        
        Debug.Log($"[WebSocketTest] {message}");
    }
}
