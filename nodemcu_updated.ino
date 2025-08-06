#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <WebSocketsClient.h>      // client to PC
#include <WebSocketsServer.h>      // server for ESP glove
#include <SoftwareSerial.h>
#include <ArduinoJson.h>           // For JSON parsing

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

ESP8266WebServer server(80);
WebSocketsClient webSocketPC;          // existing client to PC
WebSocketsServer webSocketGlove(81);   // new WebSocket server for ESP glove

void forwardToPC(const String& type, const String& value) {
  String json = "{\"type\":\"" + type + "\",\"value\":\"" + value + "\"}";
  webSocketPC.sendTXT(json);
}

// Convert web commands to Arduino Serial commands
void handleGameCommand(const String& commandType, const String& gameMode = "") {
  String arduinoCommand = "";
  
  if (commandType == "game_start") {
    arduinoCommand = "GAME_START";
    Serial.println("🎮 Converting game_start to GAME_START for Arduino");
  }
  else if (commandType == "game_stop") {
    arduinoCommand = "GAME_STOP";
    Serial.println("🛑 Converting game_stop to GAME_STOP for Arduino");
  }
  else if (commandType == "game_pause") {
    arduinoCommand = "GAME_PAUSE";
    Serial.println("⏸ Converting game_pause to GAME_PAUSE for Arduino");
  }
  else if (commandType == "game_resume") {
    arduinoCommand = "GAME_RESUME";
    Serial.println("▶ Converting game_resume to GAME_RESUME for Arduino");
  }
  else if (commandType == "game_reset") {
    arduinoCommand = "GAME_RESET";
    Serial.println("🔄 Converting game_reset to GAME_RESET for Arduino");
  }
  else if (commandType == "enable_motors") {
    arduinoCommand = "ENABLE_MOTORS";
    Serial.println("🚀 Converting enable_motors to ENABLE_MOTORS for Arduino");
  }
  else if (commandType == "disable_motors") {
    arduinoCommand = "DISABLE_MOTORS";
    Serial.println("🛑 Converting disable_motors to DISABLE_MOTORS for Arduino");
  }
  else if (commandType == "set_game_mode") {
    if (gameMode == "easy") {
      arduinoCommand = "MODE:easy";
    } else if (gameMode == "medium") {
      arduinoCommand = "MODE:medium";
    } else if (gameMode == "hard") {
      arduinoCommand = "MODE:hard";
    }
    Serial.println("🎯 Converting set_game_mode to MODE:" + gameMode + " for Arduino");
  }
  
  if (arduinoCommand != "") {
    megaSerial.println(arduinoCommand);
    Serial.println("➡ Sent to Arduino: " + arduinoCommand);
    
    // Confirm back to PC
    forwardToPC("command_sent", arduinoCommand);
  } else {
    Serial.println("❓ Unknown command type: " + commandType);
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

  // HTTP route kept if you still want fallback
  server.on("/trigger", []() {
    String msg = server.arg("msg");
    if (msg == "SHOT") {
      Serial.println("📨 SHOT received over HTTP (fallback)");

      // Forward SHOT to Mega
      megaSerial.println("SHOT");
      forwardToPC("hit_forwarded", "SHOT_from_HTTP");

      server.send(200, "text/plain", "SHOT forwarded to Mega");
    } else {
      server.send(400, "text/plain", "Invalid message");
    }
  });
  
  // Add test endpoints for Arduino commands
  server.on("/test/start", []() {
    handleGameCommand("game_start");
    server.send(200, "text/plain", "GAME_START sent to Arduino");
  });
  
  server.on("/test/pause", []() {
    handleGameCommand("game_pause");
    server.send(200, "text/plain", "GAME_PAUSE sent to Arduino");
  });
  
  server.on("/test/resume", []() {
    handleGameCommand("game_resume");
    server.send(200, "text/plain", "GAME_RESUME sent to Arduino");
  });
  
  server.on("/test/stop", []() {
    handleGameCommand("game_stop");
    server.send(200, "text/plain", "GAME_STOP sent to Arduino");
  });
  
  server.begin();
  Serial.println("🟢 HTTP Server ready with test endpoints");

  // WebSocket client to PC
  webSocketPC.begin(websocket_server, websocket_port, "/");
  webSocketPC.onEvent(webSocketEvent);
  webSocketPC.setReconnectInterval(5000);

  // WebSocket server for glove
  webSocketGlove.begin();
  webSocketGlove.onEvent(gloveWebSocketEvent);

  Serial.println("🟢 WebSocket server for glove listening on port 81");
  Serial.println("🎮 NodeMCU ready to handle game commands from web interface");
}

void loop() {
  server.handleClient();
  webSocketPC.loop();
  webSocketGlove.loop();

  // Listen for HITx/MISS from Mega
  if (megaSerial.available()) {
    String msg = megaSerial.readStringUntil('\n');
    msg.trim();

    if (msg.startsWith("HIT") || msg == "MISS") {
      Serial.println("📤 From Mega: " + msg);
      // Forward to PC
      forwardToPC("hit", msg);
    }
    // Also listen for other Arduino responses
    else if (msg.startsWith("Game") || msg.startsWith("Motors") || msg.startsWith("Mode")) {
      Serial.println("📋 Arduino Status: " + msg);
      forwardToPC("arduino_status", msg);
    }
  }
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.println("🔗 WebSocket connected to PC");
    webSocketPC.sendTXT("{\"type\":\"identify\", \"clientType\":\"nodeMCU\"}");
  } else if (type == WStype_DISCONNECTED) {
    Serial.println("❌ WebSocket disconnected from PC");
  } else if (type == WStype_TEXT) {
    String msg = String((char*)payload);
    Serial.println("📨 From PC: " + msg);
    
    // Parse JSON message from PC
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, msg);
    
    if (!error) {
      String type = doc["type"];
      String gameMode = doc["gameMode"] | "";
      
      Serial.println("🔍 Parsed command type: " + type);
      
      // Handle game control commands
      if (type == "game_start" || type == "game_stop" || type == "game_pause" || 
          type == "game_resume" || type == "game_reset" || type == "enable_motors" || 
          type == "disable_motors") {
        handleGameCommand(type, gameMode);
      }
      else if (type == "set_game_mode") {
        handleGameCommand("set_game_mode", gameMode);
      }
      else {
        Serial.println("❓ Unhandled command type: " + type);
      }
    } else {
      Serial.println("❌ Failed to parse JSON from PC");
    }
  }
}

// Handler for glove connection
void gloveWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.printf("🟢 Glove connected on client %u\n", num);
    webSocketGlove.sendTXT(num, "{\"type\":\"welcome\",\"msg\":\"Connected to NodeMCU\"}");
  } else if (type == WStype_DISCONNECTED) {
    Serial.printf("🔴 Glove disconnected on client %u\n", num);
  } else if (type == WStype_TEXT) {
    String msg = String((char*)payload, length);
    msg.trim();
    Serial.printf("📨 From Glove: %s\n", msg.c_str());

    if (msg == "SHOT") {
      // Forward to Mega
      megaSerial.println("SHOT");
      Serial.println("➡ Forwarded SHOT to Mega from Glove");
      // Also inform PC
      forwardToPC("shot_from_glove", "SHOT");
    }
  }
}
