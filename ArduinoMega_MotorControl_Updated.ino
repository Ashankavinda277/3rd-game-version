/*
  Arduino Mega Motor Control for 3rd Game Version
  This code receives motor configuration commands from NodeMCU via Serial
  and controls motors based on different game modes (Easy, Medium, Hard)
*/

// Mega pins - Updated to match your hardware
#define X_STEP_PIN 2
#define X_DIR_PIN 5
#define Y_STEP_PIN 3
#define Y_DIR_PIN 6
#define ENABLE_PIN 8

#define X_LIMIT_SWITCH_PIN 10
#define Y_LIMIT_SWITCH_PIN 11

#define SENSOR_PIN A14  // Laser sensor (BPW34)

// Modes
enum GameMode { EASY, MEDIUM, HARD };
GameMode currentMode = EASY;

// Game mode settings structure
struct GameModeSettings {
  int motorSpeed;        // Speed (30, 50, 80)
  String pattern;        // Movement pattern (linear, wave, random)
  int acceleration;      // Acceleration (10, 20, 30)
  int targetSpeed;       // Target movement interval (1500, 1200, 800)
};

// Current game state
GameModeSettings currentSettings;
bool motorsEnabled = false;
String currentGameMode = "easy";
bool gameActive = false;

// Motor direction states
bool xDirection = HIGH;
bool yDirection = HIGH;

// Limit switch state for edge detection
bool xSwitchPrev = false;
bool ySwitchPrev = false;

// Timers
unsigned long lastHit = 0;
unsigned long lastRandomToggle = 0;
unsigned long lastStep = 0;  // For motor timing
const unsigned long randomInterval = 2000;
unsigned long stepInterval = 1000;  // Dynamic step interval based on motor speed

// Pattern specific variables
float wavePhase = 0;
unsigned long lastPatternUpdate = 0;

void setup() {
  Serial.begin(9600);
  Serial1.begin(9600); // Communication with NodeMCU
  Serial.println("🚀 Starting Arduino Mega Motor Control...");
  
  // Initialize motor pins
  pinMode(X_STEP_PIN, OUTPUT);
  pinMode(X_DIR_PIN, OUTPUT);
  pinMode(Y_STEP_PIN, OUTPUT);
  pinMode(Y_DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);
  
  // Enable motors initially (LOW = enabled for most drivers) - FIXED
  digitalWrite(ENABLE_PIN, LOW);
  Serial.println("🔧 Motor pins initialized");
  
  // Set initial directions
  digitalWrite(X_DIR_PIN, xDirection);
  digitalWrite(Y_DIR_PIN, yDirection);
  
  // Initialize limit switches
  pinMode(X_LIMIT_SWITCH_PIN, INPUT_PULLUP);
  pinMode(Y_LIMIT_SWITCH_PIN, INPUT_PULLUP);
  Serial.println("🔘 Limit switches initialized");
  
  // Initialize laser sensor
  pinMode(SENSOR_PIN, INPUT);
  Serial.println("📡 Laser sensor initialized");
  
  randomSeed(analogRead(0));
  
  // Set default settings for easy mode
  setGameModeSettings("easy", 30, "linear", 10, 1500);
  
  // Start with motors enabled and game active - FIXED
  motorsEnabled = true;
  gameActive = true;
  
  Serial.println("✅ Arduino Mega Motor Control Ready");
  Serial.println("💡 Waiting for commands from NodeMCU...");
}

void loop() {
  // Laser sensor reading
  int sensorValue = analogRead(SENSOR_PIN);
  
  // Only print sensor value occasionally to reduce serial spam
  static unsigned long lastSensorPrint = 0;
  if (millis() - lastSensorPrint > 5000) {  // Print every 5 seconds
    Serial.print("Sensor Value: ");
    Serial.println(sensorValue);
    lastSensorPrint = millis();
  }

  // Check for hit detection
  if (sensorValue > 100 && millis() - lastHit > 300) {
    Serial.println("💥 Hit Detected!");
    Serial1.println("HIT");  // Send to NodeMCU
    lastHit = millis();
  }

  // Check for commands from NodeMCU (both Serial and Serial1)
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    processCommand(command);
  }
  
  if (Serial1.available()) {
    String command = Serial1.readStringUntil('\n');
    command.trim();
    processCommand(command);
  }
  
  // Update motor movement if enabled and game is active - FIXED timing
  if (motorsEnabled && gameActive) {
    if (micros() - lastStep >= stepInterval) {
      lastStep = micros();
      updateMotorMovement();
    }
  }
  
  // Small delay removed for better performance
}

void processCommand(String command) {
  // Parse commands from NodeMCU
  Serial.println("📥 Received: " + command);
  
  // Handle simple commands from NodeMCU (converted from JSON)
  if (command == "MODE:easy") {
    setGameModeSettings("easy", 30, "linear", 10, 1500);
    Serial.println("✅ Switched to EASY mode");
  }
  else if (command == "MODE:medium") {
    setGameModeSettings("medium", 50, "wave", 20, 1200);
    Serial.println("✅ Switched to MEDIUM mode");
  }
  else if (command == "MODE:hard") {
    setGameModeSettings("hard", 80, "random", 30, 800);
    Serial.println("✅ Switched to HARD mode");
  }
  else if (command == "ENABLE_MOTORS") {
    enableMotors();
    Serial.println("✅ Motors enabled");
  }
  else if (command == "DISABLE_MOTORS") {
    disableMotors();
    Serial.println("🛑 Motors disabled");
  }
  else if (command == "GAME_START") {
    gameActive = true;
    enableMotors();
    Serial.println("🎮 Game started");
  }
  else if (command == "GAME_STOP") {
    gameActive = false;
    disableMotors();
    Serial.println("⏹️ Game stopped");
  }
  else if (command == "GAME_RESET") {
    resetGame();
    Serial.println("🔄 Game reset");
  }
  else if (command.startsWith("ECHO:")) {
    Serial.println("📨 Echo received: " + command.substring(5));
  }
  // Legacy JSON support (fallback)
  else if (command.indexOf("\"type\":\"set_game_mode\"") != -1) {
    // Extract game mode and motor settings
    String gameMode = extractValue(command, "gameMode");
    
    // Extract motorSettings object values
    int motorSpeed = extractIntValue(command, "motorSpeed");
    String pattern = extractValue(command, "pattern");
    int acceleration = extractIntValue(command, "acceleration");
    int targetSpeed = extractIntValue(command, "targetSpeed");
    
    // If motorSettings values not found, use default values based on gameMode
    if (motorSpeed == 0) {
      if (gameMode == "easy") {
        motorSpeed = 30;
        pattern = "linear";
        acceleration = 10;
        targetSpeed = 1500;
      } else if (gameMode == "medium") {
        motorSpeed = 50;
        pattern = "wave";
        acceleration = 20;
        targetSpeed = 1200;
      } else if (gameMode == "hard") {
        motorSpeed = 80;
        pattern = "random";
        acceleration = 30;
        targetSpeed = 800;
      }
    }
    
    setGameModeSettings(gameMode, motorSpeed, pattern, acceleration, targetSpeed);
    Serial.println("✅ Game mode set to: " + gameMode);
  }
  else if (command.indexOf("\"type\":\"enable_motors\"") != -1) {
    enableMotors();
    gameActive = true;
    Serial.println("🚀 Motors enabled and game started");
  }
  else if (command.indexOf("\"type\":\"disable_motors\"") != -1) {
    disableMotors();
    gameActive = false;
    Serial.println("🛑 Motors disabled and game stopped");
  }
  else if (command.indexOf("\"type\":\"game_start\"") != -1) {
    gameActive = true;
    enableMotors();
    Serial.println("🎮 Game started");
  }
  else if (command.indexOf("\"type\":\"game_stop\"") != -1) {
    gameActive = false;
    disableMotors();
    Serial.println("⏹️ Game stopped");
  }
  else if (command.indexOf("\"type\":\"game_reset\"") != -1) {
    resetGame();
    Serial.println("🔄 Game reset");
  }
  else if (command.indexOf("\"type\":\"test_message\"") != -1) {
    Serial.println("📨 Test message received successfully");
  }
  else if (command == "STATUS") {
    Serial.println("📊 System Status:");
    Serial.println("  Motors Enabled: " + String(motorsEnabled));
    Serial.println("  Game Active: " + String(gameActive));
    Serial.println("  Current Mode: " + currentGameMode);
    Serial.println("  Motor Speed: " + String(currentSettings.motorSpeed));
    Serial.println("  Pattern: " + currentSettings.pattern);
    Serial.println("  Step Interval: " + String(stepInterval) + " μs");
    Serial.println("  Enable Pin State: " + String(digitalRead(ENABLE_PIN) == LOW ? "ENABLED" : "DISABLED"));
  }
  else if (command == "TEST_MOTORS") {
    Serial.println("🧪 Testing motors...");
    // Force enable for test
    bool wasEnabled = motorsEnabled;
    bool wasActive = gameActive;
    
    motorsEnabled = true;
    gameActive = true;
    digitalWrite(ENABLE_PIN, LOW);
    
    Serial.println("Testing X motor (50 steps)...");
    for (int i = 0; i < 50; i++) {
      stepMotor(X_STEP_PIN);
      delay(20);
    }
    
    Serial.println("Testing Y motor (50 steps)...");
    for (int i = 0; i < 50; i++) {
      stepMotor(Y_STEP_PIN);
      delay(20);
    }
    
    // Restore state
    motorsEnabled = wasEnabled;
    gameActive = wasActive;
    if (!motorsEnabled) digitalWrite(ENABLE_PIN, HIGH);
    
    Serial.println("✅ Motor test complete");
  }
  else if (command.length() > 0) {
    Serial.println("❓ Unknown command format: " + command);
  }
}

String extractValue(String json, String key) {
  int startIndex = json.indexOf("\"" + key + "\":");
  if (startIndex == -1) return "";
  
  startIndex = json.indexOf("\"", startIndex + key.length() + 3);
  if (startIndex == -1) return "";
  
  int endIndex = json.indexOf("\"", startIndex + 1);
  if (endIndex == -1) return "";
  
  return json.substring(startIndex + 1, endIndex);
}

int extractIntValue(String json, String key) {
  int startIndex = json.indexOf("\"" + key + "\":");
  if (startIndex == -1) return 0;
  
  startIndex = json.indexOf(":", startIndex) + 1;
  int endIndex = json.indexOf(",", startIndex);
  if (endIndex == -1) endIndex = json.indexOf("}", startIndex);
  
  String valueStr = json.substring(startIndex, endIndex);
  valueStr.trim();
  return valueStr.toInt();
}

void setGameModeSettings(String gameMode, int motorSpeed, String pattern, int acceleration, int targetSpeed) {
  currentGameMode = gameMode;
  currentSettings.motorSpeed = motorSpeed;
  currentSettings.pattern = pattern;
  currentSettings.acceleration = acceleration;
  currentSettings.targetSpeed = targetSpeed;
  
  // Calculate step interval from motor speed - FIXED calculation
  // Convert to microseconds for better precision
  stepInterval = map(motorSpeed, 30, 80, 2000, 800);
  
  // Reset timers when mode changes
  lastRandomToggle = millis();
  lastStep = micros();
  
  // Reset motor directions for new mode
  if (pattern == "random") {
    xDirection = random(0, 2);
    yDirection = random(0, 2);
    digitalWrite(X_DIR_PIN, xDirection);
    digitalWrite(Y_DIR_PIN, yDirection);
  }
  
  Serial.println("🎯 Game mode configured:");
  Serial.println("  Mode: " + gameMode);
  Serial.println("  Motor speed: " + String(motorSpeed));
  Serial.println("  Step interval: " + String(stepInterval) + "μs");
  Serial.println("  Pattern: " + pattern);
  Serial.println("  Acceleration: " + String(acceleration));
  Serial.println("  Target speed: " + String(targetSpeed));
  printCurrentMode();
}

void enableMotors() {
  motorsEnabled = true;
  digitalWrite(ENABLE_PIN, LOW); // Enable stepper drivers (LOW = enabled)
  Serial.println("🚀 Motors enabled");
}

void disableMotors() {
  motorsEnabled = false;
  digitalWrite(ENABLE_PIN, HIGH); // Disable stepper drivers (HIGH = disabled)
  Serial.println("🛑 Motors disabled");
}

void resetGame() {
  gameActive = false;
  motorsEnabled = false;
  digitalWrite(ENABLE_PIN, HIGH);
  
  // Reset directions
  xDirection = HIGH;
  yDirection = HIGH;
  digitalWrite(X_DIR_PIN, xDirection);
  digitalWrite(Y_DIR_PIN, yDirection);
  
  // Reset timers
  lastRandomToggle = millis();
  lastStep = micros();
  
  Serial.println("🔄 Game reset");
}

void updateMotorMovement() {
  // Motor movement based on current mode
  if (currentSettings.pattern == "linear") {
    updateLinearMovement();  // Easy mode - X-axis only
  } else if (currentSettings.pattern == "wave") {
    updateWaveMovement();    // Medium mode - Both X & Y axes
  } else if (currentSettings.pattern == "random") {
    updateRandomMovement();  // Hard mode - Random movement
  }
}

void updateLinearMovement() {
  // EASY MODE: X-axis only movement with limit switch detection
  checkLimitSwitchToggle(X_LIMIT_SWITCH_PIN, xSwitchPrev, xDirection, X_DIR_PIN);
  stepMotor(X_STEP_PIN);
  // Only X motor moves in easy mode
}

void updateWaveMovement() {
  // MEDIUM MODE: Both X & Y axes movement with limit switch detection
  checkLimitSwitchToggle(X_LIMIT_SWITCH_PIN, xSwitchPrev, xDirection, X_DIR_PIN);
  checkLimitSwitchToggle(Y_LIMIT_SWITCH_PIN, ySwitchPrev, yDirection, Y_DIR_PIN);
  stepMotor(X_STEP_PIN);
  stepMotor(Y_STEP_PIN);
}

void updateRandomMovement() {
  // HARD MODE: Random movement pattern for both motors
  if (millis() - lastRandomToggle > randomInterval) {
    xDirection = random(0, 2);
    yDirection = random(0, 2);
    digitalWrite(X_DIR_PIN, xDirection);
    digitalWrite(Y_DIR_PIN, yDirection);
    lastRandomToggle = millis();
    Serial.println("🎲 HARD: Direction change");
  }
  
  // Still check limit switches for safety
  checkLimitSwitchToggle(X_LIMIT_SWITCH_PIN, xSwitchPrev, xDirection, X_DIR_PIN);
  checkLimitSwitchToggle(Y_LIMIT_SWITCH_PIN, ySwitchPrev, yDirection, Y_DIR_PIN);
  
  stepMotor(X_STEP_PIN);
  stepMotor(Y_STEP_PIN);
}

void stepMotor(int pin) {
  digitalWrite(pin, HIGH);
  delayMicroseconds(500);  // Shorter pulse width for faster stepping
  digitalWrite(pin, LOW);
  delayMicroseconds(500);
}

void checkLimitSwitchToggle(int pin, bool &prev, bool &dir, int dirPin) {
  bool pressed = (digitalRead(pin) == LOW);
  if (pressed && !prev) {
    dir = !dir;
    digitalWrite(dirPin, dir);
    prev = true;
  }
  if (!pressed) prev = false;
}

void printCurrentMode() {
  Serial.print("🎯 Current Mode: ");
  if (currentGameMode == "easy") {
    Serial.println("EASY (X-axis motor only)");
  } else if (currentGameMode == "medium") {
    Serial.println("MEDIUM (Both X & Y motors)");
  } else if (currentGameMode == "hard") {
    Serial.println("HARD (Random movement - Both motors)");
  }
}
