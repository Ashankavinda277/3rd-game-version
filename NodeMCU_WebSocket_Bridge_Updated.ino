/*
  NodeMCU ESP8266 WebSocket Bridge
  Fixed version with p  // Test Arduino Mega communication
  megaSerial.println("HELLO_FROM_NODEMCU");
  Serial.println("📤 Test message sent to Arduino Mega");er pin naming - July 2025
  
  PIN CONNECTIONS:
  NodeMCU D5 (GPIO14) -> Arduino Mega RX1 (Pin 19)  [NodeMCU TX -> Mega RX]
  NodeMCU D6 (GPIO12) <- Arduino Mega TX1 (Pin 18)  [NodeMCU RX <- Mega TX]
  NodeMCU GND        <-> Arduino Mega GND           [Common Ground]
*/

#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <SoftwareSerial.h>

// WiFi credentials
const char* ssid = "Asiri Harichndra📱";
const char* password = "asiri12345";

// WebSocket server info
const char* websocket_server = "172.20.10.4";  // Your PC IP
const int websocket_port = 5000;

// SoftwareSerial pins for communication with Arduino Mega
// NodeMCU Pin Labels -> GPIO Numbers -> Arduino Mega Connection
#define NODEMCU_RX_PIN 14  // NodeMCU D5 (GPIO14) <- Arduino Mega TX1 (Pin 18)
#define NODEMCU_TX_PIN 12  // NodeMCU D6 (GPIO12) -> Arduino Mega RX1 (Pin 19)

// Create SoftwareSerial: SoftwareSerial(RX_pin, TX_pin)
SoftwareSerial megaSerial(NODEMCU_RX_PIN, NODEMCU_TX_PIN);

WebSocketsClient webSocket;
bool wsConnected = false;

void setup() {
  Serial.begin(9600);
  megaSerial.begin(9600);
  
  delay(1000);
  Serial.println("🚀 NodeMCU WebSocket Bridge Starting...");
  Serial.println("📌 Pin Configuration:");
  Serial.println("   NodeMCU D5 (GPIO14) -> Arduino Mega RX1 (Pin 19)");
  Serial.println("   NodeMCU D6 (GPIO12) <- Arduino Mega TX1 (Pin 18)");
  Serial.println("   Baud Rate: 9600");

  // Connect WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Setup WebSocket
  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  
  Serial.println("🔗 Attempting WebSocket connection...");
  
  // Test Mega communication
  megaSerial.println("HELLO_FROM_NODEMCU");
  Serial.println("� Test message sent to Mega");
}

void loop() {
  webSocket.loop();

  // Read from Arduino Mega and send to WebSocket
  if (megaSerial.available()) {
    String msg = megaSerial.readStringUntil('\n');
    msg.trim();

    if (msg.length() > 0) {
      Serial.print("📥 From Arduino Mega: ");
      Serial.println(msg);

      if (wsConnected) {
        if (msg == "HIT") {
          webSocket.sendTXT("HIT");
          Serial.println("📤 HIT forwarded to server");
        } else {
          webSocket.sendTXT(msg);
          Serial.println("📤 Message forwarded to server: " + msg);
        }
      } else {
        Serial.println("⚠️ WebSocket not connected - message not forwarded");
      }
    }
  }
}

// WebSocket event handler
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      {
        Serial.println("🔗 WebSocket connected successfully!");
        wsConnected = true;
        
        // Send identification immediately
        String identifyMsg = "{\"type\":\"identify\", \"clientType\":\"nodeMCU\", \"timestamp\":" + String(millis()) + "}";
        webSocket.sendTXT(identifyMsg);
        Serial.println("📤 Identification sent");
      }
      break;

    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket disconnected");
      wsConnected = false;
      break;

    case WStype_TEXT:
      {
        String message = String((char*)payload);
        Serial.print("📥 From Server: ");
        Serial.println(message);

        // Parse and convert complex JSON to simple commands for Arduino Mega
        if (message.indexOf("enable_motors") != -1) {
          megaSerial.println("ENABLE_MOTORS");
          Serial.println("📤 ENABLE_MOTORS command sent to Arduino Mega");
        }
        else if (message.indexOf("disable_motors") != -1) {
          megaSerial.println("DISABLE_MOTORS");
          Serial.println("📤 DISABLE_MOTORS command sent to Arduino Mega");
        }
        else if (message.indexOf("set_game_mode") != -1) {
          // Extract game mode from JSON and send simple command
          if (message.indexOf("easy") != -1) {
            megaSerial.println("MODE:easy");
            Serial.println("📤 Game mode 'easy' sent to Arduino Mega");
          } else if (message.indexOf("medium") != -1) {
            megaSerial.println("MODE:medium");
            Serial.println("📤 Game mode 'medium' sent to Arduino Mega");
          } else if (message.indexOf("hard") != -1) {
            megaSerial.println("MODE:hard");
            Serial.println("📤 Game mode 'hard' sent to Arduino Mega");
          }
        }
        else if (message.indexOf("game_start") != -1) {
          megaSerial.println("GAME_START");
          Serial.println("📤 GAME_START command sent to Arduino Mega");
        }
        else if (message.indexOf("game_stop") != -1) {
          megaSerial.println("GAME_STOP");
          Serial.println("📤 GAME_STOP command sent to Arduino Mega");
        }
        else if (message.indexOf("game_reset") != -1) {
          megaSerial.println("GAME_RESET");
          Serial.println("📤 GAME_RESET command sent to Arduino Mega");
        }
        else {
          // For testing, echo other messages
          megaSerial.println("ECHO:" + message);
          Serial.println("📤 Echo command sent to Arduino Mega");
        }
      }
      break;

    case WStype_ERROR:
      Serial.print("❌ WebSocket Error: ");
      Serial.println((char*)payload);
      wsConnected = false;
      break;

    case WStype_FRAGMENT_TEXT_START:
    case WStype_FRAGMENT_BIN_START:
    case WStype_FRAGMENT:
    case WStype_FRAGMENT_FIN:
      Serial.println("📦 Received WebSocket fragment");
      break;

    case WStype_PING:
      Serial.println("💓 Received ping");
      break;

    case WStype_PONG:
      Serial.println("💓 Received pong");
      break;

    default:
      Serial.print("🔍 Unknown WebSocket event type: ");
      Serial.println(type);
      break;
  }
}
