/*
  Arduino Mega Motor Control for 3rd Game Version
  Fixed & improved version - July 2025
*/

#define X_STEP_PIN 2
#define X_DIR_PIN 5
#define Y_STEP_PIN 3
#define Y_DIR_PIN 6
#define ENABLE_PIN 8

#define X_LIMIT_SWITCH_PIN 10
#define Y_LIMIT_SWITCH_PIN 11

#define SENSOR_PIN A14  // Laser sensor (BPW34)

enum GameMode { EASY, MEDIUM, HARD };
GameMode currentMode = EASY;

struct GameModeSettings {
  int motorSpeed;
  String pattern;
  int acceleration;
  int targetSpeed;
};

GameModeSettings currentSettings;
bool motorsEnabled = false;
String currentGameMode = "easy";
bool gameActive = false;

bool xDirection = HIGH;
bool yDirection = HIGH;

bool xSwitchPrev = false;
bool ySwitchPrev = false;

unsigned long lastHit = 0;
unsigned long lastRandomToggle = 0;
unsigned long lastStep = 0;
const unsigned long randomInterval = 2000;
unsigned long stepInterval = 100;

float wavePhase = 0;
unsigned long lastPatternUpdate = 0;

void setup() {
  Serial.begin(9600);
  Serial1.begin(9600);
  Serial.println("🚀 Starting Arduino Mega Motor Control...");

  pinMode(X_STEP_PIN, OUTPUT);
  pinMode(X_DIR_PIN, OUTPUT);
  pinMode(Y_STEP_PIN, OUTPUT);
  pinMode(Y_DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);
  digitalWrite(ENABLE_PIN, HIGH); // Start with motors disabled

  digitalWrite(X_DIR_PIN, xDirection);
  digitalWrite(Y_DIR_PIN, yDirection);

  pinMode(X_LIMIT_SWITCH_PIN, INPUT_PULLUP);
  pinMode(Y_LIMIT_SWITCH_PIN, INPUT_PULLUP);
  pinMode(SENSOR_PIN, INPUT);

  randomSeed(analogRead(A0));

  setGameModeSettings("easy", 30, "linear", 10, 1500);

  Serial.println("✅ Arduino Mega Motor Control Ready");
  Serial.println("💡 Waiting for commands from NodeMCU...");
  Serial.println("📋 Available commands: ENABLE_MOTORS, DISABLE_MOTORS, STATUS, TEST_MOTORS");
}

void loop() {
  int sensorValue = analogRead(SENSOR_PIN);
  static unsigned long lastSensorPrint = 0;
  if (millis() - lastSensorPrint > 5000) {  // Print every 5 seconds instead of 1
    Serial.print("Sensor Value: ");
    Serial.println(sensorValue);
    lastSensorPrint = millis();
  }

  if (sensorValue > 100 && millis() - lastHit > 300) {
    Serial.println("💥 Hit Detected!");
    Serial1.println("HIT");
    lastHit = millis();
  }

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

  if (motorsEnabled && gameActive) {
    updateMotorMovement();
  }

  delay(1);
}

void processCommand(String command) {
  Serial.println("📥 Received: " + command);

  // Handle simple commands from NodeMCU first (these are the ones that should work!)
  if (command == "ENABLE_MOTORS") {
    enableMotors();
    gameActive = true;
    Serial.println("🚀 Motors enabled via simple command");
  }
  else if (command == "DISABLE_MOTORS") {
    disableMotors();
    gameActive = false;
    Serial.println("🛑 Motors disabled via simple command");
  }
  else if (command == "GAME_START") {
    gameActive = true;
    enableMotors();
    Serial.println("🎮 Game started via simple command");
  }
  else if (command == "GAME_STOP") {
    gameActive = false;
    disableMotors();
    Serial.println("⏹️ Game stopped via simple command");
  }
  else if (command == "GAME_RESET") {
    resetGame();
    Serial.println("🔄 Game reset via simple command");
  }
  else if (command == "MODE:easy" || command.indexOf("MODE:easy") >= 0) {
    setGameModeSettings("easy", 30, "linear", 10, 1500);
    Serial.println("✅ Switched to EASY mode");
  }
  else if (command == "MODE:medium" || command.indexOf("MODE:medium") >= 0) {
    setGameModeSettings("medium", 50, "wave", 20, 1200);
    Serial.println("✅ Switched to MEDIUM mode");
  }
  else if (command == "MODE:hard" || command.indexOf("MODE:hard") >= 0) {
    setGameModeSettings("hard", 80, "random", 30, 800);
    Serial.println("✅ Switched to HARD mode");
  }
  else if (command == "STATUS") {
    Serial.println("📊 System Status:");
    Serial.println("  Motors Enabled: " + String(motorsEnabled));
    Serial.println("  Game Active: " + String(gameActive));
    Serial.println("  Current Mode: " + currentGameMode);
    Serial.println("  Motor Speed: " + String(currentSettings.motorSpeed));
    Serial.println("  Pattern: " + currentSettings.pattern);
    Serial.println("  Step Interval: " + String(stepInterval) + " ms");
    Serial.println("  Enable Pin State: " + String(digitalRead(ENABLE_PIN) == LOW ? "ENABLED" : "DISABLED"));
  }
  else if (command == "TEST_MOTORS") {
    Serial.println("🧪 Testing motors...");
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
    
    motorsEnabled = wasEnabled;
    gameActive = wasActive;
    if (!motorsEnabled) digitalWrite(ENABLE_PIN, HIGH);
    
    Serial.println("✅ Motor test complete");
  }
  else if (command.startsWith("HELLO_FROM_NODEMCU")) {
    Serial.println("👋 Hello received from NodeMCU - Communication working!");
  }
  else if (command.startsWith("ECHO:")) {
    Serial.println("📨 Echo received: " + command.substring(5));
  }
  // Legacy JSON support (fallback)
  else if (command.indexOf("\"type\":\"set_game_mode\"") != -1) {
    String gameMode = extractValue(command, "gameMode");
    int motorSpeed = extractIntValue(command, "motorSpeed");
    String pattern = extractValue(command, "pattern");
    int acceleration = extractIntValue(command, "acceleration");
    int targetSpeed = extractIntValue(command, "targetSpeed");

    if (motorSpeed <= 0) {
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
    Serial.println("⏹ Game stopped");
  }
  else if (command.indexOf("\"type\":\"game_reset\"") != -1) {
    resetGame();
    Serial.println("🔄 Game reset");
  }
  else if (command.indexOf("\"type\":\"test_message\"") != -1) {
    Serial.println("📨 Test message received successfully");
  }
  else {
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
  if (startIndex == -1 || startIndex >= json.length()) return 0;

  startIndex = json.indexOf(":", startIndex) + 1;
  int endIndex = json.indexOf(",", startIndex);
  if (endIndex == -1) endIndex = json.indexOf("}", startIndex);
  if (endIndex == -1) return 0;

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

  stepInterval = map(motorSpeed, 30, 80, 100, 25);

  lastRandomToggle = millis();
  lastStep = millis();

  if (pattern == "random") {
    xDirection = random(0, 2) ? HIGH : LOW;
    yDirection = random(0, 2) ? HIGH : LOW;
    digitalWrite(X_DIR_PIN, xDirection);
    digitalWrite(Y_DIR_PIN, yDirection);
  }

  Serial.println("🎯 Game mode configured:");
  Serial.println("  Mode: " + gameMode);
  Serial.println("  Motor speed: " + String(motorSpeed));
  Serial.println("  Step interval: " + String(stepInterval) + "ms");
  Serial.println("  Pattern: " + pattern);
  Serial.println("  Acceleration: " + String(acceleration));
  Serial.println("  Target speed: " + String(targetSpeed));
  printCurrentMode();
}

void enableMotors() {
  motorsEnabled = true;
  digitalWrite(ENABLE_PIN, LOW);  // LOW = enabled for most stepper drivers
  Serial.println("🚀 Motors enabled - Enable pin set to LOW");
}

void disableMotors() {
  motorsEnabled = false;
  digitalWrite(ENABLE_PIN, HIGH);  // HIGH = disabled
  Serial.println("🛑 Motors disabled - Enable pin set to HIGH");
}

void resetGame() {
  gameActive = false;
  motorsEnabled = false;
  digitalWrite(ENABLE_PIN, HIGH);

  xDirection = HIGH;
  yDirection = HIGH;
  digitalWrite(X_DIR_PIN, xDirection);
  digitalWrite(Y_DIR_PIN, yDirection);

  lastRandomToggle = millis();
  lastStep = millis();

  Serial.println("🔄 Game reset");
}

void updateMotorMovement() {
  if (millis() - lastStep >= stepInterval) {
    lastStep = millis();

    if (currentSettings.pattern == "linear") {
      updateLinearMovement();
    } else if (currentSettings.pattern == "wave") {
      updateWaveMovement();
    } else if (currentSettings.pattern == "random") {
      updateRandomMovement();
    }
  }
}

void updateLinearMovement() {
  checkLimitSwitchToggle(X_LIMIT_SWITCH_PIN, xSwitchPrev, xDirection, X_DIR_PIN);
  stepMotor(X_STEP_PIN);
  static unsigned long stepCount = 0;
  if (++stepCount % 1000 == 0) {
    Serial.println("🔄 EASY: X-axis only");
  }
}

void updateWaveMovement() {
  checkLimitSwitchToggle(X_LIMIT_SWITCH_PIN, xSwitchPrev, xDirection, X_DIR_PIN);
  checkLimitSwitchToggle(Y_LIMIT_SWITCH_PIN, ySwitchPrev, yDirection, Y_DIR_PIN);
  stepMotor(X_STEP_PIN);
  stepMotor(Y_STEP_PIN);
  static unsigned long stepCount = 0;
  if (++stepCount % 1000 == 0) {
    Serial.println("🔄 MEDIUM: Both axes");
  }
}

void updateRandomMovement() {
  if (millis() - lastRandomToggle > randomInterval) {
    xDirection = random(0, 2) ? HIGH : LOW;
    yDirection = random(0, 2) ? HIGH : LOW;
    digitalWrite(X_DIR_PIN, xDirection);
    digitalWrite(Y_DIR_PIN, yDirection);
    lastRandomToggle = millis();
    Serial.println("🎲 HARD: Direction change");
  }
  stepMotor(X_STEP_PIN);
  stepMotor(Y_STEP_PIN);
}

void stepMotor(int pin) {
  digitalWrite(pin, HIGH);
  delayMicroseconds(500);
  digitalWrite(pin, LOW);
  delayMicroseconds(500);
}

void checkLimitSwitchToggle(int pin, bool &prev, bool &dir, int dirPin) {
  bool pressed = (digitalRead(pin) == LOW);
  if (pressed && !prev) {
    dir = !dir;
    digitalWrite(dirPin, dir);
    prev = true;
    Serial.print("🔄 Limit switch hit on pin ");
    Serial.print(pin);
    Serial.println(" - Direction reversed");
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
