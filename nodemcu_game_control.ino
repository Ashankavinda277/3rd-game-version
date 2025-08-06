#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <WebSocketsClient.h>       // client to PC
#include <WebSocketsServer.h>       // server for glove
#include <SoftwareSerial.h>

// WiFi Credentials
const char* ssid = "Asiri Harichndra📱";
const char* password = "asiri12345";

// WebSocket server (PC) details
const char* websocket_server = "172.20.10.4";
const int websocket_port = 5000;

// Mega Serial (TX from Mega to NodeMCU RX D5)
#define MEGA_RX_PIN D5  // NodeMCU RX from Mega TX1 (Pin 18 on Mega)
#define MEGA_TX_PIN D6  // NodeMCU TX to Mega RX1 (Pin 19 on Mega)
SoftwareSerial megaSerial(MEGA_RX_PIN, MEGA_TX_PIN);

// HTTP fallback server
ESP8266WebServer server(80);

// WebSocket client to PC
WebSocketsClient webSocketPC;

// WebSocket server for glove (ESP32/ESP8266 glove)
WebSocketsServer webSocketGlove(81);

void forwardToPC(const String& type, const String& value) {
  String json = "{\"type\":\"" + type + "\",\"value\":\"" + value + "\"}";
  webSocketPC.sendTXT(json);
}

// Handle game control commands from web interface
void handleGameCommand(const String& message) {
  String arduinoCommand = "";
  String description = "";
  
  // Parse web commands and convert to Arduino commands
  if (message.indexOf("game_start") >= 0) {
    arduinoCommand = "GAME_START";
    description = "Game start with countdown";
  }
  else if (message.indexOf("game_stop") >= 0) {
    arduinoCommand = "GAME_STOP";
    description = "Game stop";
  }
  else if (message.indexOf("game_pause") >= 0) {
    arduinoCommand = "GAME_PAUSE";
    description = "Game pause with symbol";
  }
  else if (message.indexOf("game_resume") >= 0) {
    arduinoCommand = "GAME_RESUME";
    description = "Game resume";
  }
  else if (message.indexOf("game_reset") >= 0) {
    arduinoCommand = "GAME_RESET";
    description = "Game reset";
  }
  else if (message.indexOf("enable_motors") >= 0) {
    arduinoCommand = "ENABLE_MOTORS";
    description = "Enable motors";
  }
  else if (message.indexOf("disable_motors") >= 0) {
    arduinoCommand = "DISABLE_MOTORS";
    description = "Disable motors";
  }
  else if (message.indexOf("\"gameMode\":\"easy\"") >= 0) {
    arduinoCommand = "MODE:easy";
    description = "Set easy mode";
  }
  else if (message.indexOf("\"gameMode\":\"medium\"") >= 0) {
    arduinoCommand = "MODE:medium";
    description = "Set medium mode";
  }
  else if (message.indexOf("\"gameMode\":\"hard\"") >= 0) {
    arduinoCommand = "MODE:hard";
    description = "Set hard mode";
  }
  
  if (arduinoCommand != "") {
    Serial.println("🎮 " + description + " -> " + arduinoCommand);
    megaSerial.println(arduinoCommand);
    Serial.println("➡ Sent to Arduino: " + arduinoCommand);
    
    // Confirm back to PC
    forwardToPC("command_sent", arduinoCommand);
  }
}

void setup() {
  Serial.begin(115200);
  megaSerial.begin(9600);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Connected to WiFi");
  Serial.println("IP: " + WiFi.localIP().toString());

  // HTTP fallback route to receive "SHOT" from glove
  server.on("/trigger", []() {
    String msg = server.arg("msg");
    if (msg == "SHOT") {
      Serial.println("📨 SHOT received over HTTP (fallback)");

      // Forward to Mega
      megaSerial.println("SHOT");
      forwardToPC("shot_from_http", "SHOT");

      server.send(200, "text/plain", "SHOT forwarded to Mega");
    } else {
      server.send(400, "text/plain", "Invalid message");
    }
  });
  
  // Add test endpoints for Arduino commands
  server.on("/test/start", []() {
    Serial.println("🧪 Test: Sending GAME_START");
    megaSerial.println("GAME_START");
    server.send(200, "text/plain", "GAME_START sent to Arduino");
  });
  
  server.on("/test/pause", []() {
    Serial.println("🧪 Test: Sending GAME_PAUSE");
    megaSerial.println("GAME_PAUSE");
    server.send(200, "text/plain", "GAME_PAUSE sent to Arduino");
  });
  
  server.on("/test/resume", []() {
    Serial.println("🧪 Test: Sending GAME_RESUME");
    megaSerial.println("GAME_RESUME");
    server.send(200, "text/plain", "GAME_RESUME sent to Arduino");
  });
  
  server.on("/test/stop", []() {
    Serial.println("🧪 Test: Sending GAME_STOP");
    megaSerial.println("GAME_STOP");
    server.send(200, "text/plain", "GAME_STOP sent to Arduino");
  });
  
  server.begin();
  Serial.println("🟢 HTTP Server ready (fallback + test endpoints)");

  // WebSocket client to PC
  webSocketPC.begin(websocket_server, websocket_port, "/");
  webSocketPC.onEvent(webSocketEvent);
  webSocketPC.setReconnectInterval(5000);

  // WebSocket server for glove
  webSocketGlove.begin();
  webSocketGlove.onEvent(gloveWebSocketEvent);
  Serial.println("🟢 WebSocket server for glove listening on port 81");
  Serial.println("🎮 Ready to handle game commands from web interface");
}

void loop() {
  server.handleClient();
  webSocketPC.loop();
  webSocketGlove.loop();

  // Listen for HITx/MISS from Mega and forward to PC
  if (megaSerial.available()) {
    String msg = megaSerial.readStringUntil('\n');
    msg.trim();
    if (msg.length() == 0) return;

    if (msg.startsWith("HIT") || msg == "MISS") {
      Serial.println("📤 From Mega: " + msg);
      forwardToPC("hit", msg);
    }
    // Also forward other Arduino status messages
    else if (msg.startsWith("Game") || msg.startsWith("Motors") || msg.startsWith("Mode")) {
      Serial.println("📋 Arduino Status: " + msg);
      forwardToPC("arduino_status", msg);
    }
  }
}

// WebSocket client callback (PC)
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.println("🔗 WebSocket connected to PC");
    webSocketPC.sendTXT("{\"type\":\"identify\", \"clientType\":\"nodeMCU\"}");
  } else if (type == WStype_DISCONNECTED) {
    Serial.println("❌ WebSocket disconnected from PC");
  } else if (type == WStype_TEXT) {
    // Safe construction of string from payload+length
    String msg = "";
    for (size_t i = 0; i < length; i++) {
      msg += (char)payload[i];
    }
    msg.trim();
    Serial.println("📨 From PC: " + msg);
    
    // Handle game control commands from web interface
    handleGameCommand(msg);
  }
}

// Handler for glove WebSocket connections
void gloveWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.printf("🟢 Glove connected on client %u\n", num);
    webSocketGlove.sendTXT(num, "{\"type\":\"welcome\",\"msg\":\"Connected to NodeMCU\"}");
  } else if (type == WStype_DISCONNECTED) {
    Serial.printf("🔴 Glove disconnected on client %u\n", num);
  } else if (type == WStype_TEXT) {
    String msg = "";
    for (size_t i = 0; i < length; i++) {
      msg += (char)payload[i];
    }
    msg.trim();
    Serial.printf("📨 From Glove: %s\n", msg.c_str());

    if (msg == "SHOT") {
      // Forward to Mega
      megaSerial.println("SHOT");
      Serial.println("➡ Forwarded SHOT to Mega from Glove");
      forwardToPC("shot_from_glove", "SHOT");
    }
  }
}
