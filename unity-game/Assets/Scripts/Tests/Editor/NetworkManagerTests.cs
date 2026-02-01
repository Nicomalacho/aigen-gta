using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using System.Collections;
using System.Threading.Tasks;

namespace Tests
{
    [TestFixture]
    public class NetworkManagerTests
    {
        private NetworkManager networkManager;
        private const string TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTIzIiwic3RlYW1JZCI6InN0ZWFtLTQ1NiIsInRpZXIiOiJzdGFydGVyIn0.test-signature";
        private const string TEST_URL = "ws://localhost:3001";

        [SetUp]
        public void Setup()
        {
            // Create a new GameObject and add NetworkManager
            var gameObject = new GameObject("NetworkManagerTest");
            networkManager = gameObject.AddComponent<NetworkManager>();
            networkManager.serverUrl = TEST_URL;
        }

        [TearDown]
        public void TearDown()
        {
            // Cleanup
            if (networkManager != null)
            {
                networkManager.Disconnect();
                Object.Destroy(networkManager.gameObject);
            }
        }

        [UnityTest]
        public IEnumerator Connect_ValidToken_ConnectionStateBecomesConnected()
        {
            // Arrange
            var connectionStateChanged = false;
            ConnectionState newState = ConnectionState.Disconnected;
            
            networkManager.OnConnectionStateChanged += (state) => {
                connectionStateChanged = true;
                newState = state;
            };
            
            // Act
            networkManager.Connect(TEST_TOKEN);
            
            // Wait for connection (max 5 seconds)
            var timeout = Time.time + 5f;
            while (Time.time < timeout && newState != ConnectionState.Connected)
            {
                yield return null;
            }
            
            // Assert
            Assert.IsTrue(connectionStateChanged, "Connection state should have changed");
            Assert.AreEqual(ConnectionState.Connected, newState, "Should be connected");
            Assert.IsTrue(networkManager.IsConnected, "IsConnected should be true");
        }

        [UnityTest]
        public IEnumerator Connect_InvalidToken_ConnectionFails()
        {
            // Arrange
            var invalidToken = "invalid_token";
            var errorReceived = false;
            string errorMessage = "";
            
            networkManager.OnError += (error) => {
                errorReceived = true;
                errorMessage = error;
            };
            
            // Act
            networkManager.Connect(invalidToken);
            
            // Wait for error (max 3 seconds)
            var timeout = Time.time + 3f;
            while (Time.time < timeout && !errorReceived)
            {
                yield return null;
            }
            
            // Assert
            Assert.IsTrue(errorReceived, "Should receive error for invalid token");
            Assert.IsFalse(networkManager.IsConnected, "Should not be connected");
        }

        [UnityTest]
        public IEnumerator SendMessage_ValidMessage_SendsSuccessfully()
        {
            // Arrange
            var message = new CharacterChatMessage
            {
                type = MessageType.CHARACTER_CHAT,
                characterId = "char-123",
                message = "Hello from Unity!"
            };
            
            var messageSent = false;
            
            // First connect
            networkManager.Connect(TEST_TOKEN);
            
            // Wait for connection
            var timeout = Time.time + 5f;
            while (Time.time < timeout && !networkManager.IsConnected)
            {
                yield return null;
            }
            
            Assert.IsTrue(networkManager.IsConnected, "Should be connected before sending");
            
            // Act
            networkManager.SendMessage(message, (success) => {
                messageSent = success;
            });
            
            // Wait for send
            yield return new WaitForSeconds(0.5f);
            
            // Assert
            Assert.IsTrue(messageSent, "Message should be sent successfully");
        }

        [UnityTest]
        public IEnumerator OnMessageReceived_ValidResponse_InvokesCallback()
        {
            // Arrange
            var messageReceived = false;
            BaseMessage receivedMessage = null;
            
            networkManager.OnMessageReceived += (msg) => {
                messageReceived = true;
                receivedMessage = msg;
            };
            
            // Connect first
            networkManager.Connect(TEST_TOKEN);
            
            // Wait for connection
            var timeout = Time.time + 5f;
            while (Time.time < timeout && !networkManager.IsConnected)
            {
                yield return null;
            }
            
            // Send a message to trigger a response
            var message = new CharacterChatMessage
            {
                type = MessageType.CHARACTER_CHAT,
                characterId = "char-123",
                message = "Test message"
            };
            
            networkManager.SendMessage(message);
            
            // Wait for response (max 3 seconds)
            timeout = Time.time + 3f;
            while (Time.time < timeout && !messageReceived)
            {
                yield return null;
            }
            
            // Assert
            Assert.IsTrue(messageReceived, "Should receive message response");
            Assert.IsNotNull(receivedMessage, "Received message should not be null");
        }

        [UnityTest]
        public IEnumerator Disconnect_GracefullyClosesConnection()
        {
            // Arrange
            var disconnected = false;
            
            networkManager.OnConnectionStateChanged += (state) => {
                if (state == ConnectionState.Disconnected)
                {
                    disconnected = true;
                }
            };
            
            // Connect first
            networkManager.Connect(TEST_TOKEN);
            
            // Wait for connection
            var timeout = Time.time + 5f;
            while (Time.time < timeout && !networkManager.IsConnected)
            {
                yield return null;
            }
            
            Assert.IsTrue(networkManager.IsConnected, "Should be connected before disconnecting");
            
            // Act
            networkManager.Disconnect();
            
            // Wait for disconnect
            yield return new WaitForSeconds(0.5f);
            
            // Assert
            Assert.IsFalse(networkManager.IsConnected, "Should be disconnected");
        }
    }

    // Test message classes
    public class TestMessage : BaseMessage
    {
        public string data;
    }
}
