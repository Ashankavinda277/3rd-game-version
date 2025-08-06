# NodeMCU Requirements for Arduino Integration

## Overview
The NodeMCU acts as a bridge between the web backend and Arduino Mega, converting WebSocket messages to Serial commands that the Arduino can understand.

## WebSocket to Serial Command Mapping

The NodeMCU should listen for these WebSocket message types and convert them to Serial commands:

### Game Control Commands

| WebSocket Message Type | Arduino Serial Command | Description |
|------------------------|------------------------|-------------|
| `game_start` | `GAME_START` | Starts countdown (3-2-1-GO) then begins game |
| `game_stop` | `GAME_STOP` | Stops game and clears LED display |
| `game_pause` | `GAME_PAUSE` | Pauses game and shows pause symbol |
| `game_resume` | `GAME_RESUME` | Resumes game or restarts countdown |
| `game_reset` | `GAME_RESET` | Resets game state |

### Motor Control Commands

| WebSocket Message Type | Arduino Serial Command | Description |
|------------------------|------------------------|-------------|
| `enable_motors` | `ENABLE_MOTORS` | Enable motor movement |
| `disable_motors` | `DISABLE_MOTORS` | Disable motor movement |

### Game Mode Commands

| WebSocket Message | Arduino Serial Command | Description |
|------------------|------------------------|-------------|
| `set_game_mode` with `gameMode: "easy"` | `MODE:easy` | Set easy mode |
| `set_game_mode` with `gameMode: "medium"` | `MODE:medium` | Set medium mode |
| `set_game_mode` with `gameMode: "hard"` | `MODE:hard` | Set hard mode |

## Expected Arduino Responses

The NodeMCU should forward these Arduino Serial responses back to the web backend:

| Arduino Serial Output | WebSocket Message Type | Description |
|-----------------------|------------------------|-------------|
| `HIT1` | `hit` with `sensor: 1` | Hit detected on sensor 1 (10 points) |
| `HIT2` | `hit` with `sensor: 2` | Hit detected on sensor 2 (5 points) |
| `HIT3` | `hit` with `sensor: 3` | Hit detected on sensor 3 (2 points) |

## Arduino Mega Countdown System

When the Arduino receives `GAME_START`, it automatically:
1. Starts a 4-second countdown display (3-2-1-GO)
2. Shows the countdown numbers on the LED matrix
3. Automatically enables motors after countdown
4. Begins the game

The web interface timer runs independently but should be synchronized with the Arduino countdown.

## Pause/Resume Behavior

- `GAME_PAUSE`: Arduino shows pause symbol and stops motors
- `GAME_RESUME`: Arduino either:
  - Restarts countdown if game was paused during countdown
  - Resumes normal game if paused during active gameplay

## NodeMCU Implementation Notes

1. **WebSocket Connection**: Connect to backend WebSocket server
2. **Serial Communication**: Use Serial communication with Arduino Mega (typically 9600 baud)
3. **Message Parsing**: Parse JSON WebSocket messages and extract command type
4. **Command Translation**: Convert WebSocket commands to exact Arduino Serial strings
5. **Response Processing**: Monitor Arduino Serial output and forward relevant data to backend

## Example NodeMCU Code Structure

```cpp
void handleWebSocketMessage(String message) {
  // Parse JSON message
  if (message.indexOf("game_start") > -1) {
    Serial.println("GAME_START");
  }
  else if (message.indexOf("game_pause") > -1) {
    Serial.println("GAME_PAUSE");  
  }
  else if (message.indexOf("game_resume") > -1) {
    Serial.println("GAME_RESUME");
  }
  // ... other commands
}

void loop() {
  // Check for Arduino Serial input
  if (Serial.available()) {
    String arduinoMessage = Serial.readString();
    if (arduinoMessage.startsWith("HIT")) {
      // Forward hit data to backend via WebSocket
      sendHitData(arduinoMessage);
    }
  }
  
  // Handle WebSocket messages
  // ... WebSocket handling code
}
```

This ensures proper integration between the web interface and your Arduino countdown/pause system.
