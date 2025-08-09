const WebSocket = require("ws");
const { initializeWebSocketService } = require("./services/webSocketService");
const GameSessionService = require("./services/gameSessionService");
const axios = require("axios");
// Store active sessions by player name for quick lookup
const activeSessions = new Map();

// Create a WebSocket server
const setupWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });

  // Store connected clients by type
  const clients = {
    web: new Set(),
    nodeMCU: new Set(),
  };

  // Initialize WebSocket service
  initializeWebSocketService(wss, clients);

  // Helper function to broadcast status to web clients
  const broadcastStatus = (message) => {
    clients.web.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };

  // Helper function to get connection stats
  const getConnectionStats = () => {
    return {
      type: "connection_stats",
      webClients: clients.web.size,
      nodeMCUClients: clients.nodeMCU.size,
      totalClients: wss.clients.size,
      timestamp: Date.now(),
    };
  };

  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection from:", req.socket.remoteAddress);
    console.log("Connection headers:", req.headers);

    // Initially mark as unidentified
    ws.clientType = "unidentified";

    // Auto-identify NodeMCU based on User-Agent or other headers
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('ESP') || userAgent.includes('Arduino') || req.headers['sec-websocket-protocol']) {
      console.log("Auto-identifying as NodeMCU based on headers");
      ws.clientType = "nodeMCU";
      clients.nodeMCU.add(ws);
      
      // Send immediate confirmation
      ws.send(JSON.stringify({
        type: "identification_confirmed",
        clientType: "nodeMCU",
        timestamp: Date.now(),
        message: "Auto-identified as NodeMCU"
      }));
      
      // Notify web clients
      broadcastStatus({
        type: "nodeMCU_connected",
        timestamp: Date.now(),
        message: "NodeMCU device has connected (auto-identified)",
        ...getConnectionStats(),
      });
    }

    // Send a welcome message immediately
    ws.send(JSON.stringify({
      type: "connection",
      status: "connected",
      message: "WebSocket connection established",
      timestamp: Date.now(),
      serverId: "SmartShootingGallery",
      connectionStats: getConnectionStats()
    }));

    // Handle messages from clients
ws.on("message", async (message) => {
      try {
        // First check if the message is valid JSON
        const messageStr = message.toString().trim();
        console.log("Raw message received:", messageStr);

        // Handle non-JSON messages (including from NodeMCU/Arduino)
        if (messageStr === "HIT1" || messageStr === "HIT2"|| messageStr === "HIT3" || messageStr === "MISS" || messageStr.startsWith("From Server:")) {
          console.log("Received simple message:", messageStr);
          
          // Auto-identify as NodeMCU if not already identified
          if (ws.clientType === "unidentified") {
            console.log("Auto-identifying sender as NodeMCU");
            ws.clientType = "nodeMCU";
            clients.nodeMCU.add(ws);
            
            broadcastStatus({
              type: "nodeMCU_connected",
              timestamp: Date.now(),
              message: "NodeMCU device identified from message pattern",
              ...getConnectionStats(),
            });
          }

          // Handle HIT and MISS messages
          if (messageStr === "HIT1" || messageStr === "HIT2"|| messageStr === "HIT3" || messageStr === "MISS") {
            console.log("🎯 Processing hardware hit:", messageStr);
            
            // Set score increment based on hit type
            let scoreIncrement = 0;
            if (messageStr === "HIT1") scoreIncrement = 10;
            else if (messageStr === "HIT2") scoreIncrement = 5;
            else if (messageStr === "HIT3") scoreIncrement = 2;
            else if (messageStr === "MISS") scoreIncrement = 0;

            // Create a proper hit message for web clients with score increment
            const hitData = {
              type: messageStr === "MISS" ? "target_miss" : "target_hit",
              targetId: 0,
              timestamp: Date.now(),
              scoreIncrement,
              rawMessage: messageStr,
              hitType: messageStr === "MISS" ? "miss" : "direct_hit",
            };

            // Find the most recent active session for hardware hits
            try {
              const activeSession = await GameSessionService.getMostRecentActiveSession();
              
              if (activeSession) {
                console.log("📊 Found active session for hit:", activeSession.sessionId);
                
                // Register hit in the active session (even for misses)
                const result = await GameSessionService.registerHit(
                  activeSession.sessionId,
                  {
                    points: hitData.scoreIncrement,
                    targetId: hitData.targetId,
                    isHit: messageStr !== "MISS",
                    zone: messageStr === "MISS" ? "miss" : "center",
                  }
                );

                // Create session-aware hit message
                const sessionHitData = {
                  ...hitData,
                  sessionId: activeSession.sessionId,
                  currentScore: result.currentScore,
                  hitCount: result.hitCount,
                  totalShots: result.totalShots,
                  accuracy: result.totalShots > 0 ? (result.hitCount / result.totalShots) * 100 : 0,
                  type: messageStr === "MISS" ? "miss_registered" : "hit_registered",
                };

                // Send to all web clients
                clients.web.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(sessionHitData));
                  }
                });
                
                console.log("✅ Hit/Miss registered successfully - Score:", result.currentScore);
              } else {
                console.log("⚠️ No active session found - sending generic hit data");
                
                // No active session, send generic hit data to all web clients
                clients.web.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(hitData));
                  }
                });
              }
            } catch (error) {
              console.error("❌ Error processing hit in session:", error);
              
              // Fallback: send generic hit data
              clients.web.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(hitData));
                }
              });
            }

            // Broadcast hit statistics to all clients
            broadcastStatus({
              type: messageStr === "MISS" ? "miss_registered" : "hit_registered",
              timestamp: Date.now(),
              message: messageStr === "MISS" ? "Miss detected and processed" : "Hit detected and processed",
              hitData: hitData,
              timestamp: Date.now()
            });
            
            return; // Exit early after handling the special case
          }
          
          // Handle other NodeMCU status messages
          if (messageStr.startsWith("From Server:")) {
            console.log("NodeMCU status message:", messageStr);
            
            broadcastStatus({
              type: "nodeMCU_status",
              message: messageStr,
              timestamp: Date.now()
            });
            return;
          }

          return; // Exit early after handling non-JSON messages
        }

        // FIXED: Better JSON parsing with malformed message handling
        let data;
        try {
          data = JSON.parse(messageStr);
        } catch (parseError) {
          console.error("JSON parsing error:", parseError);
          console.log("Attempting to extract useful data from malformed JSON");
          
          // Try to handle malformed JSON from ESP8266
          if (messageStr.includes('"type":"command_sent"')) {
            // Extract command information from malformed nested JSON
            const commandMatch = messageStr.match(/"command_sent":"([^"]+)"/);
            const descMatch = messageStr.match(/"description":"([^"]+)"/);
            
            if (commandMatch && commandMatch[1]) {
              const command = commandMatch[1];
              const description = descMatch ? descMatch[1] : "No description";
              
              console.log("🔧 Extracted command from malformed JSON:", command, "-", description);
              
              // Auto-identify as NodeMCU if not already identified
              if (ws.clientType === "unidentified") {
                console.log("Auto-identifying as NodeMCU based on command message");
                ws.clientType = "nodeMCU";
                clients.nodeMCU.add(ws);
                
                broadcastStatus({
                  type: "nodeMCU_connected",
                  timestamp: Date.now(),
                  message: "NodeMCU device identified from command pattern",
                  ...getConnectionStats(),
                });
              }
              
              // Broadcast command execution to web clients
              const commandData = {
                type: "command_executed",
                command: command,
                description: description,
                timestamp: Date.now(),
                source: "nodeMCU"
              };
              
              clients.web.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(commandData));
                }
              });
              
              broadcastStatus({
                type: "command_processed",
                command: command,
                description: description,
                timestamp: Date.now(),
                message: `Command '${command}' processed successfully`
              });
              
              return;
            }
          }
          
          // Handle other malformed message types
          if (messageStr.includes('"type":"game_state"')) {
            const stateMatch = messageStr.match(/"value":"([^"]+)"/);
            if (stateMatch && stateMatch[1]) {
              const state = stateMatch[1];
              console.log("🎮 Extracted game state from malformed JSON:", state);
              
              broadcastStatus({
                type: "game_state_update",
                state: state,
                timestamp: Date.now(),
                message: `Game state changed to: ${state}`
              });
              
              return;
            }
          }
          
          if (messageStr.includes('"type":"hit"') || messageStr.includes('HIT') || messageStr.includes('MISS')) {
            const hitMatch = messageStr.match(/"value":"([^"]*(?:HIT|MISS)[^"]*)"/);
            if (hitMatch && hitMatch[1]) {
              const hitValue = hitMatch[1];
              console.log("🎯 Extracted hit value from malformed JSON:", hitValue);
              
              // Process as hit event (recursive call with clean message)
              const cleanMessage = Buffer.from(hitValue);
              ws.emit('message', cleanMessage);
              return;
            }
          }
          
          // If we can't extract anything useful, log and continue
          console.log("❓ Could not extract useful data from malformed message, ignoring");
          return;
        }

        // Check if this is a device identification message
        if (data.type === "identify") {
          if (data.clientType === "nodeMCU") {
            console.log("NodeMCU device identified and registered via JSON");
            ws.clientType = "nodeMCU";
            clients.nodeMCU.add(ws);

            // Notify web clients about NodeMCU connection
            broadcastStatus({
              type: "nodeMCU_connected",
              timestamp: Date.now(),
              message: "NodeMCU device has connected",
              ...getConnectionStats(),
            });
          } else if (data.clientType === "web") {
            console.log("Web client identified and registered");
            ws.clientType = "web";
            clients.web.add(ws);

            // Store session info if provided
            if (data.sessionId) {
              ws.sessionId = data.sessionId;
              ws.playerName = data.playerName;
              console.log(
                `Web client associated with session: ${data.sessionId}`
              );
            }

            // Send connection stats to newly connected web client
            ws.send(JSON.stringify(getConnectionStats()));
          }

          // Send confirmation back to the client
          ws.send(
            JSON.stringify({
              type: "identification_confirmed",
              clientType: ws.clientType,
              timestamp: Date.now(),
            })
          );

          return;
        }

        // Auto-identify based on message content if not already identified
        if (ws.clientType === "unidentified") {
          // Check for typical NodeMCU/Arduino message patterns
          if (data.type && (data.type.includes("motor") || data.type.includes("sensor") || data.type.includes("hit") || data.type.includes("command") || data.type.includes("game_state"))) {
            console.log("Auto-identifying as NodeMCU based on message content");
            ws.clientType = "nodeMCU";
            clients.nodeMCU.add(ws);
            
            broadcastStatus({
              type: "nodeMCU_connected",
              timestamp: Date.now(),
              message: "NodeMCU auto-identified from message pattern",
              ...getConnectionStats(),
            });
          } else {
            // Assume web client
            console.log("Auto-identifying as web client");
            ws.clientType = "web";
            clients.web.add(ws);
          }
        }

        // Handle session-related messages
        if (data.type === "session_info") {
          if (ws.clientType === "web") {
            ws.sessionId = data.sessionId;
            ws.playerName = data.playerName;
            console.log(
              `Web client session info updated: ${data.sessionId} - ${data.playerName}`
            );
          }
          return;
        }

        console.log(`Received data from ${ws.clientType}:`, data);

        // Handle messages from web clients
        if (ws.clientType === "web") {
          // Handle game control messages (start, stop, pause, resume, reset)
          if (["game_start", "game_stop", "game_pause", "game_resume", "game_reset"].includes(data.type)) {
            console.log("🎮 Game control command received from web client:", data);
            
            // Forward to NodeMCU devices
            clients.nodeMCU.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                console.log("📤 Sending game control to NodeMCU:", JSON.stringify(data));
                client.send(JSON.stringify(data));
              }
            });
            
            // Broadcast to web clients for confirmation
            broadcastStatus({
              type: `${data.type}_sent`,
              timestamp: Date.now(),
              message: `Game control '${data.type}' sent to hardware`
            });
            return;
          }

          // Handle game mode configuration messages
          if (data.type === "set_game_mode") {
            console.log("🎮 Game mode configuration received from web client:", data);
            
            // Forward to NodeMCU devices with the exact structure expected by Arduino
            clients.nodeMCU.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const motorCommand = {
                  type: "set_game_mode",
                  gameMode: data.gameMode,
                  motorSettings: data.motorSettings,
                  motorEnabled: data.motorEnabled || false,
                  timestamp: Date.now()
                };
                
                console.log("📤 Sending to NodeMCU:", JSON.stringify(motorCommand));
                client.send(JSON.stringify(motorCommand));
              }
            });
            
            // Broadcast to web clients for confirmation
            broadcastStatus({
              type: "game_mode_configured",
              gameMode: data.gameMode,
              motorSettings: data.motorSettings,
              timestamp: Date.now(),
              message: `Game mode '${data.gameMode}' configured on hardware`
            });
            return;
          }

          // Handle motor enable/disable messages
          if (data.type === "enable_motors" || data.type === "disable_motors") {
            console.log("🔧 Motor control command received from web client:", data);
            
            // Forward to NodeMCU devices with clear structure
            clients.nodeMCU.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const motorCommand = {
                  type: data.type,
                  gameMode: data.gameMode || "easy",
                  motorEnabled: data.type === "enable_motors",
                  timestamp: Date.now()
                };
                
                console.log("📤 Sending motor command to NodeMCU:", JSON.stringify(motorCommand));
                client.send(JSON.stringify(motorCommand));
              }
            });
            
            // Broadcast to web clients for confirmation
            broadcastStatus({
              type: data.type === "enable_motors" ? "motors_enabled" : "motors_disabled",
              gameMode: data.gameMode,
              timestamp: Date.now(),
              message: data.type === "enable_motors" ? "Motors enabled and started" : "Motors disabled and stopped"
            });
            return;
          }
        }

        // Process data from NodeMCU (which got it from Mega via Serial)
        if (ws.clientType === "nodeMCU") {
          // Log the specific data from NodeMCU for debugging
          console.log("NodeMCU data received:", data);

          // Handle command confirmation messages
          if (data.type === "command_sent" || data.type === "command_executed") {
            console.log("🔧 Command confirmation from NodeMCU:", data);
            
            // Broadcast to web clients
            clients.web.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "command_confirmed",
                  command: data.value || data.command,
                  timestamp: Date.now(),
                  source: "hardware"
                }));
              }
            });
            
            broadcastStatus({
              type: "command_confirmed",
              command: data.value || data.command,
              timestamp: Date.now(),
              message: "Command confirmed by hardware"
            });
            return;
          }

          // Handle game state updates
          if (data.type === "game_state") {
            console.log("🎮 Game state update from NodeMCU:", data);
            
            // Forward to web clients
            clients.web.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "game_state_update",
                  state: data.value,
                  timestamp: Date.now(),
                  source: "hardware"
                }));
              }
            });
            
            broadcastStatus({
              type: "game_state_update",
              state: data.value,
              timestamp: Date.now(),
              message: `Game state: ${data.value}`
            });
            return;
          }

          // Handle simple HIT message format
          if (data.type === "hit" && (data.value === "HIT" || data.value.includes("HIT") || data.value === "MISS")) {
            console.log("🎯 Processing NodeMCU hit data:", data);
            
            // Determine score based on hit value
            let scoreIncrement = 0;
            if (data.value.includes("HIT1") || data.value === "HIT1") scoreIncrement = 10;
            else if (data.value.includes("HIT2") || data.value === "HIT2") scoreIncrement = 5;
            else if (data.value.includes("HIT3") || data.value === "HIT3") scoreIncrement = 2;
            else if (data.value.includes("MISS") || data.value === "MISS") scoreIncrement = 0;
            else if (data.value === "HIT") scoreIncrement = 10; // Default hit
            
            // Convert to the expected format for frontend
            const hitData = {
              type: scoreIncrement > 0 ? "target_hit" : "target_miss",
              targetId: data.targetId || 0,
              timestamp: Date.now(),
              scoreIncrement: scoreIncrement,
              hitValue: data.value,
              zone: scoreIncrement > 0 ? (data.zone || "center") : "miss",
            };

            // Forward processed data to all web clients
            clients.web.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(hitData));
              }
            });

            // Broadcast hit statistics
            broadcastStatus({
              type: scoreIncrement > 0 ? "hit_registered" : "miss_registered",
              timestamp: Date.now(),
              message: scoreIncrement > 0 ? "Hit detected from NodeMCU" : "Miss detected from NodeMCU",
              hitData: hitData,
            });

            // Send to API (only for hits, not misses to avoid unnecessary database operations)
            if (scoreIncrement > 0) {
              axios
                .post("http://localhost:5000/api/game/hit", {
                  message: "Hit registered from NodeMCU WebSocket",
                  timestamp: Date.now(),
                  source: "nodeMCU",
                  zone: hitData.zone,
                  accuracy: hitData.accuracy,
                  points: scoreIncrement
                })
                .then(() => {
                  console.log("✅ Sent HIT to API via axios");
                })
                .catch((err) => {
                  console.error("❌ Failed to send HIT to API:", err.message);
                });
            }
            return;
          }
          
          // Handle heartbeat messages
          if (data.type === "heartbeat") {
            console.log("💓 Heartbeat from NodeMCU");
            
            // Respond to heartbeat
            ws.send(JSON.stringify({
              type: "heartbeat_response",
              timestamp: Date.now()
            }));
            return;
          }
          
          // Handle any other JSON messages from NodeMCU
          else {
            console.log("📨 Other NodeMCU message:", data);
            
            // Forward Arduino Mega data to all web clients
            clients.web.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  ...data,
                  timestamp: Date.now(),
                  source: "hardware"
                }));
              }
            });
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);

        // Handle unparseable messages more gracefully
        try {
          const rawMessage = message.toString().trim();
          console.log("Attempting to handle unparseable message:", rawMessage);

          // Create a fallback message format
          const fallbackData = {
            type: "unparsed_message",
            rawContent: rawMessage,
            timestamp: Date.now(),
            clientType: ws.clientType || "unknown",
          };

          // If it seems to be from a sensor or contains certain keywords
          if (
            rawMessage.includes("HIT") ||
            rawMessage.includes("MISS") ||
            rawMessage.includes("hit") ||
            rawMessage.includes("target") ||
            ws.clientType === "nodeMCU"
          ) {
            console.log("🎯 Treating unparseable message as possible hit event");
            
            // Try to extract hit information
            let scoreIncrement = 0;
            if (rawMessage.includes("HIT1")) scoreIncrement = 10;
            else if (rawMessage.includes("HIT2")) scoreIncrement = 5;
            else if (rawMessage.includes("HIT3")) scoreIncrement = 2;
            else if (rawMessage.includes("HIT")) scoreIncrement = 10;
            else if (rawMessage.includes("MISS")) scoreIncrement = 0;
            
            const hitData = {
              type: scoreIncrement > 0 ? "target_hit" : "target_miss",
              targetId: 0,
              timestamp: Date.now(),
              scoreIncrement: scoreIncrement,
              rawMessage: rawMessage,
              hitType: "extracted_from_unparsed",
            };

            // Forward to web clients
            clients.web.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(hitData));
              }
            });

            console.log("✅ Processed unparseable message as hit event");
          } else {
            // Log other unparseable messages but don't process them
            console.log("❓ Ignoring unparseable message that doesn't seem to be a hit event");
          }
        } catch (fallbackError) {
          console.error(
            "Failed to handle message with fallback method:",
            fallbackError
          );
        }
      }
    });

    // Handle disconnection
    ws.on("close", (code, reason) => {
      console.log(
        `WebSocket connection closed for client type: ${
          ws.clientType || "unidentified"
        }`
      );
      console.log(
        `Close code: ${code}, reason: ${reason || "No reason provided"}`
      );

      // Remove client from appropriate set
      if (ws.clientType === "web") {
        clients.web.delete(ws);
        console.log(
          `Web client disconnected. Remaining web clients: ${clients.web.size}`
        );

        // Broadcast updated connection stats to remaining web clients
        broadcastStatus(getConnectionStats());
      } else if (ws.clientType === "nodeMCU") {
        clients.nodeMCU.delete(ws);
        console.log(
          `NodeMCU client disconnected. Remaining NodeMCU clients: ${clients.nodeMCU.size}`
        );

        // Notify web clients that NodeMCU disconnected
        broadcastStatus({
          type: "nodeMCU_disconnected",
          timestamp: Date.now(),
          message: "NodeMCU device has disconnected",
          ...getConnectionStats(),
        });
      }
    });

    // Handle WebSocket errors
    ws.on("error", (error) => {
      console.error(
        `WebSocket error for client type ${ws.clientType || "unidentified"}:`,
        error
      );

      // Clean up the client from sets
      if (ws.clientType === "web") {
        clients.web.delete(ws);
      } else if (ws.clientType === "nodeMCU") {
        clients.nodeMCU.delete(ws);
      }
    });

    // Handle ping/pong for connection keepalive
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Mark connection as alive initially
    ws.isAlive = true;

    // Send a welcome message and request identification (but don't require it)
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "welcome",
            status: "ready",
            message: "WebSocket connection ready. Send any message to start communication.",
            timestamp: Date.now(),
            serverId: "SmartShootingGallery",
            clientType: ws.clientType,
            connectionStats: getConnectionStats()
          })
        );
      }
    }, 100); // Small delay to ensure connection is fully established
  });

  // Heartbeat mechanism to detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(
          `Terminating dead connection for client type: ${
            ws.clientType || "unidentified"
          }`
        );

        // Clean up client from sets
        if (ws.clientType === "web") {
          clients.web.delete(ws);
        } else if (ws.clientType === "nodeMCU") {
          clients.nodeMCU.delete(ws);
        }

        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // Check every 30 seconds

  // Clean up heartbeat interval when server closes
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
};

module.exports = setupWebSocketServer;
