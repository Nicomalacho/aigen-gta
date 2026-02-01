using System.IO;
using UnityEditor;
using UnityEngine;

public class SetupWebSocketDependencies : EditorWindow
{
    [MenuItem("AI Agent GTA/Setup WebSocket Dependencies")]
    public static void ShowWindow()
    {
        GetWindow<SetupWebSocketDependencies>("Setup WebSocket");
    }

    private void OnGUI()
    {
        GUILayout.Label("WebSocket Dependencies Setup", EditorStyles.boldLabel);
        GUILayout.Space(10);

        GUILayout.Label("Required Dependencies:", EditorStyles.label);
        GUILayout.Label("1. WebSocketSharp.dll", EditorStyles.label);
        GUILayout.Label("2. Newtonsoft.Json (via Unity Package Manager)", EditorStyles.label);
        
        GUILayout.Space(20);

        if (GUILayout.Button("Install Newtonsoft.Json", GUILayout.Height(30)))
        {
            InstallNewtonsoftJson();
        }

        GUILayout.Space(10);

        if (GUILayout.Button("Open Package Manager", GUILayout.Height(30)))
        {
            OpenPackageManager();
        }

        GUILayout.Space(20);

        EditorGUILayout.HelpBox(
            "WebSocketSharp Setup:\n" +
            "1. Download WebSocketSharp from: https://github.com/sta/websocket-sharp\n" +
            "2. Build the DLL or download pre-built version\n" +
            "3. Copy WebSocketSharp.dll to Assets/Plugins/\n" +
            "4. Set platform settings to 'Any Platform'",
            MessageType.Info
        );
    }

    private static void InstallNewtonsoftJson()
    {
        // Add Newtonsoft.Json package
        var request = UnityEditor.PackageManager.Client.Add("com.unity.nuget.newtonsoft-json@3.2.1");
        
        EditorUtility.DisplayProgressBar("Installing Package", "Adding Newtonsoft.Json...", 0.5f);
        
        while (!request.IsCompleted)
        {
            System.Threading.Thread.Sleep(100);
        }
        
        EditorUtility.ClearProgressBar();

        if (request.Status == UnityEditor.PackageManager.StatusCode.Success)
        {
            EditorUtility.DisplayDialog("Success", "Newtonsoft.Json installed successfully!", "OK");
            Debug.Log("Newtonsoft.Json installed");
        }
        else if (request.Status >= UnityEditor.PackageManager.StatusCode.Failure)
        {
            EditorUtility.DisplayDialog("Error", $"Failed to install: {request.Error.message}", "OK");
            Debug.LogError($"Failed to install Newtonsoft.Json: {request.Error.message}");
        }
    }

    private static void OpenPackageManager()
    {
        UnityEditor.PackageManager.UI.Window.Open("com.unity.nuget.newtonsoft-json");
    }

    [MenuItem("AI Agent GTA/Run Network Tests")]
    public static void RunTests()
    {
        // Open Test Runner
        var testRunnerWindow = EditorWindow.GetWindow(System.Type.GetType("UnityEditor.TestTools.TestRunner.TestRunnerWindow,UnityEditor.TestRunner"));
        if (testRunnerWindow != null)
        {
            testRunnerWindow.Show();
            testRunnerWindow.Focus();
        }
        else
        {
            // Alternative: Open via menu
            EditorApplication.ExecuteMenuItem("Window/General/Test Runner");
        }
    }
}
