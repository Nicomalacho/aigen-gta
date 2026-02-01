// Mock WebSocketSharp for testing without the actual DLL
// This allows the code to compile for demonstration purposes
// In production, use the real WebSocketSharp.dll

#if MOCK_WEBSOCKETSHARP

using System;

namespace WebSocketSharp
{
    public enum WebSocketState
    {
        Connecting,
        Open,
        Closing,
        Closed
    }

    public class WebSocket
    {
        public WebSocketState ReadyState { get; private set; } = WebSocketState.Closed;
        
        public event EventHandler OnOpen;
        public event EventHandler<MessageEventArgs> OnMessage;
        public event EventHandler<ErrorEventArgs> OnError;
        public event EventHandler<CloseEventArgs> OnClose;

        public WebSocket(string url)
        {
            // Mock implementation
        }

        public void SetCredentials(string username, string password, bool preAuth)
        {
            // Mock implementation
        }

        public void ConnectAsync()
        {
            ReadyState = WebSocketState.Connecting;
            // Simulate connection after delay
            System.Threading.Tasks.Task.Delay(100).ContinueWith(_ =>
            {
                ReadyState = WebSocketState.Open;
                OnOpen?.Invoke(this, EventArgs.Empty);
            });
        }

        public void CloseAsync()
        {
            ReadyState = WebSocketState.Closing;
            System.Threading.Tasks.Task.Delay(50).ContinueWith(_ =>
            {
                ReadyState = WebSocketState.Closed;
                OnClose?.Invoke(this, new CloseEventArgs(1000, "Normal closure"));
            });
        }

        public void SendAsync(string data, Action<bool> completed)
        {
            if (ReadyState == WebSocketState.Open)
            {
                completed?.Invoke(true);
            }
            else
            {
                completed?.Invoke(false);
            }
        }
    }

    public class MessageEventArgs : EventArgs
    {
        public string Data { get; }
        
        public MessageEventArgs(string data)
        {
            Data = data;
        }
    }

    public class ErrorEventArgs : EventArgs
    {
        public string Message { get; }
        public Exception Exception { get; }
        
        public ErrorEventArgs(string message, Exception exception = null)
        {
            Message = message;
            Exception = exception;
        }
    }

    public class CloseEventArgs : EventArgs
    {
        public ushort Code { get; }
        public string Reason { get; }
        
        public CloseEventArgs(ushort code, string reason)
        {
            Code = code;
            Reason = reason;
        }
    }
}

#endif
