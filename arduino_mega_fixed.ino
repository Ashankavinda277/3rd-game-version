/*
  Arduino Mega Motor Control for 3rd Game Version
  Updated & Improved - August 2025
  FIXED: Score Display Issue
*/

#include <Adafruit_NeoPixel.h>

#define X_STEP_PIN 2
#define X_DIR_PIN 5
#define Y_STEP_PIN 3
#define Y_DIR_PIN 6
#define ENABLE_PIN 8

#define X_LIMIT_SWITCH_PIN 10
#define Y_LIMIT_SWITCH_PIN 11

#define SENSOR1_PIN A13  // Range 1 - Near
#define SENSOR2_PIN A14  // Range 2 - Middle
#define SENSOR3_PIN A15  // Range 3 - Far

// NeoPixel LED Matrix Setup
#define LED_PIN 47        // LED data pin
#define WIDTH 14          // Number of columns
#define HEIGHT 8          // Number of rows
#define NUM_LEDS WIDTH * HEIGHT
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// DFPlayer Mini Setup
#define DFPLAYER_SERIAL Serial2  // Use Serial2 (TX2=16, RX2=17) on Arduino Mega

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
bool gameStarted = false;
bool gamePaused = false;
bool gameModeChosen = false;  // Track if game mode has been chosen

bool xDirection = HIGH;
bool yDirection = HIGH;

bool xSwitchPrev = false;
bool ySwitchPrev = false;

// Pause symbol matrix (1 = LED ON, 0 = LED OFF)
const uint8_t pauseSymbol[HEIGHT][WIDTH] = {
  {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}, // Row 0 (top)
  {0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0}, // Row 1
  {0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0}, // Row 2
  {0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0}, // Row 3
  {0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0}, // Row 4
  {0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0}, // Row 5
  {0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0}, // Row 6
  {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}  // Row 7 (bottom)
};

unsigned long lastHit = 0;
unsigned long lastRandomToggle = 0;
unsigned long lastStep = 0;
unsigned long lastXStep = 0;  // For smooth X-axis stepping in EASY mode
unsigned long lastYStep = 0;  // For smooth Y-axis stepping in MEDIUM mode
const unsigned long randomInterval = 2000;
unsigned long stepInterval = 100;
unsigned long xStepInterval = 2000;  // Microseconds for smooth X-axis movement in EASY mode
unsigned long yStepInterval = 2200;  // Microseconds for smooth Y-axis movement in MEDIUM mode

const int sensorThreshold = 100;  // Threshold for hit detection
const unsigned long hitCooldown = 300; // ms cooldown between hits
bool shotReceived = false;  // Flag to track if SHOT was received from NodeMCU

// Hit display timing
const unsigned long hitDisplayDuration = 2000; // ms to show the HIT display
unsigned long hitDisplayEnd = 0;
bool hitShowing = false;

unsigned long lastScoreUpdate = 0;
const unsigned long scoreUpdateInterval = 500;  // Update score every 500 ms

// Game state variables
int gameScore = 0;
bool showingCountdown = false;
unsigned long scoreDisplayEnd = 0;
bool scoreShowing = false;
bool countdownActive = false;  // Track if countdown is active
int countdownNumber = 0;       // Current countdown number
unsigned long countdownStart = 0;  // When countdown started

// HIT Matrix Pattern
byte hitMatrix[8][14] = {
  {1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1},
  {1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0},
  {1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0},
  {1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0},
  {1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0},
  {1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0},
  {1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1},
  {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
};

// Font and display functions
const uint8_t font5x7[][5] PROGMEM = {
  // space (32)
  {0x00,0x00,0x00,0x00,0x00}, // 32
  // '!' (33)
  {0x00,0x00,0x5F,0x00,0x00},
  // '"' (34)
  {0x00,0x07,0x00,0x07,0x00},
  // '#' (35)
  {0x14,0x7F,0x14,0x7F,0x14},
  // '$' (36)
  {0x24,0x2A,0x7F,0x2A,0x12},
  // '%' (37)
  {0x23,0x13,0x08,0x64,0x62},
  // '&' (38)
  {0x36,0x49,0x55,0x22,0x50},
  // ''' (39)
  {0x00,0x05,0x03,0x00,0x00},
  // '(' (40)
  {0x00,0x1C,0x22,0x41,0x00},
  // ')' (41)
  {0x00,0x41,0x22,0x1C,0x00},
  // '*' (42)
  {0x14,0x08,0x3E,0x08,0x14},
  // '+' (43)
  {0x08,0x08,0x3E,0x08,0x08},
  // ',' (44)
  {0x00,0x50,0x30,0x00,0x00},
  // '-' (45)
  {0x08,0x08,0x08,0x08,0x08},
  // '.' (46)
  {0x00,0x60,0x60,0x00,0x00},
  // '/' (47)
  {0x20,0x10,0x08,0x04,0x02},
  // '0' (48)
  {0x3E,0x51,0x49,0x45,0x3E},
  // '1' (49)
  {0x00,0x42,0x7F,0x40,0x00},
  // '2' (50)
  {0x42,0x61,0x51,0x49,0x46},
  // '3' (51)
  {0x21,0x41,0x45,0x4B,0x31},
  // '4' (52)
  {0x18,0x14,0x12,0x7F,0x10},
  // '5' (53)
  {0x27,0x45,0x45,0x45,0x39},
  // '6' (54)
  {0x3C,0x4A,0x49,0x49,0x30},
  // '7' (55)
  {0x01,0x71,0x09,0x05,0x03},
  // '8' (56)
  {0x36,0x49,0x49,0x49,0x36},
  // '9' (57)
  {0x06,0x49,0x49,0x29,0x1E},
  // ':' (58)
  {0x00,0x36,0x36,0x00,0x00},
  // ';' (59)
  {0x00,0x56,0x36,0x00,0x00},
  // '<' (60)
  {0x08,0x14,0x22,0x41,0x00},
  // '=' (61)
  {0x14,0x14,0x14,0x14,0x14},
  // '>' (62)
  {0x00,0x41,0x22,0x14,0x08},
  // '?' (63)
  {0x02,0x01,0x51,0x09,0x06},
  // '@' (64)
  {0x32,0x49,0x79,0x41,0x3E},
  // 'A' (65)
  {0x7E,0x11,0x11,0x11,0x7E},
  // 'B' (66)
  {0x7F,0x49,0x49,0x49,0x36},
  // 'C' (67)
  {0x3E,0x41,0x41,0x41,0x22},
  // 'D' (68)
  {0x7F,0x41,0x41,0x22,0x1C},
  // 'E' (69)
  {0x7F,0x49,0x49,0x49,0x41},
  // 'F' (70)
  {0x7F,0x09,0x09,0x09,0x01},
  // 'G' (71)
  {0x3E,0x41,0x49,0x49,0x7A},
  // 'H' (72)
  {0x7F,0x08,0x08,0x08,0x7F},
  // 'I' (73)
  {0x00,0x41,0x7F,0x41,0x00},
  // 'J' (74)
  {0x20,0x40,0x41,0x3F,0x01},
  // 'K' (75)
  {0x7F,0x08,0x14,0x22,0x41},
  // 'L' (76)
  {0x7F,0x40,0x40,0x40,0x40},
  // 'M' (77)
  {0x7F,0x02,0x0C,0x02,0x7F},
  // 'N' (78)
  {0x7F,0x04,0x08,0x10,0x7F},
  // 'O' (79)
  {0x3E,0x41,0x41,0x41,0x3E},
  // 'P' (80)
  {0x7F,0x09,0x09,0x09,0x06},
  // 'Q' (81)
  {0x3E,0x41,0x51,0x21,0x5E},
  // 'R' (82)
  {0x7F,0x09,0x19,0x29,0x46},
  // 'S' (83)
  {0x46,0x49,0x49,0x49,0x31},
  // 'T' (84)
  {0x01,0x01,0x7F,0x01,0x01},
  // 'U' (85)
  {0x3F,0x40,0x40,0x40,0x3F},
  // 'V' (86)
  {0x1F,0x20,0x40,0x20,0x1F},
  // 'W' (87)
  {0x7F,0x20,0x18,0x20,0x7F},
  // 'X' (88)
  {0x63,0x14,0x08,0x14,0x63},
  // 'Y' (89)
  {0x07,0x08,0x70,0x08,0x07},
  // 'Z' (90)
  {0x61,0x51,0x49,0x45,0x43}
};

int getLedIndex(int row, int col) {
  if (row % 2 == 0) {
    return row * WIDTH + (WIDTH - 1 - col);
  } else {
    return row * WIDTH + col;
  }
}

void scrollText(const char* msg, uint32_t color, int delayMs) {
  int charWidth = 5;
  int space = 1;
  int fullCharWidth = charWidth + space;
  int messageCols = strlen(msg) * fullCharWidth;
  int totalScroll = messageCols + WIDTH;

  for (int offset = 0; offset < totalScroll; offset++) {
    strip.clear();
    for (int x = 0; x < WIDTH; x++) {
      int virtualCol = offset - (WIDTH - 1 - x);
      if (virtualCol < 0) continue;
      int charPos = virtualCol / fullCharWidth;
      int colInChar = virtualCol % fullCharWidth;
      if (colInChar < charWidth) {
        if (msg[charPos] != '\0') {
          char c = msg[charPos];
          if (c >= 32 && c <= 90) {
            uint8_t fontCol = pgm_read_byte_near(font5x7[c - 32] + colInChar);
            for (int row = 0; row < HEIGHT; row++) {
              if (fontCol & (1 << row)) {
                int idx = getLedIndex(row, x);
                strip.setPixelColor(idx, color);
              }
            }
          }
        }
      }
    }
    strip.show();
    delay(delayMs);
    
    // Allow interruption for important game states (pause, countdown, game active)
    if (strcmp(msg, "SMART SHOOTING GALLERY ") == 0 && 
        (Serial.available() || Serial1.available() || gamePaused || countdownActive || gameActive)) {
      break;
    }
  }
}

void showHitGreen() {
  for (int row = 0; row < HEIGHT; row++) {
    for (int col = 0; col < WIDTH; col++) {
      int index = getLedIndex(row, col);
      if (hitMatrix[row][col] == 1) {
        strip.setPixelColor(index, strip.Color(0, 255, 0));
      } else {
        strip.setPixelColor(index, strip.Color(0, 0, 0));
      }
    }
  }
  strip.show();
}

// FIXED: Static score display function - no scrolling
void showScore(int score, uint32_t color) {
  strip.clear();
  
  // Convert score to string
  char scoreText[8];
  snprintf(scoreText, sizeof(scoreText), "%d", score);
  
  // Display score statically in center
  int startX = (WIDTH - strlen(scoreText) * 6) / 2; // Center the text
  if (startX < 0) startX = 0;
  
  for (int charIndex = 0; charIndex < strlen(scoreText); charIndex++) {
    char c = scoreText[charIndex];
    if (c >= '0' && c <= '9') {
      uint8_t* fontData = (uint8_t*)font5x7[c - 32];
      
      for (int col = 0; col < 5; col++) {
        int x = startX + charIndex * 6 + col;
        if (x >= WIDTH) break;
        
        uint8_t fontCol = pgm_read_byte_near(fontData + col);
        for (int row = 0; row < HEIGHT; row++) {
          if (fontCol & (1 << row)) {
            int idx = getLedIndex(row, x);
            strip.setPixelColor(idx, color);
          }
        }
      }
    }
  }
  
  strip.show();
}

void showPause() {
  strip.clear();
  
  // Use the pause symbol matrix pattern
  for (int row = 0; row < HEIGHT; row++) {
    for (int col = 0; col < WIDTH; col++) {
      int ledIndex = getLedIndex(row, col);
      if (pauseSymbol[row][col] == 1) {
        strip.setPixelColor(ledIndex, strip.Color(255, 255, 0)); // Yellow color
      } else {
        strip.setPixelColor(ledIndex, 0); // Turn off
      }
    }
  }
  
  strip.show();
}

// Countdown display function
void showCountdown(int number) {
  strip.clear();
  
  // Convert number to string
  char countText[2];
  snprintf(countText, sizeof(countText), "%d", number);
  
  // Display countdown number large and centered
  int startX = (WIDTH - 5) / 2; // Center single digit (5 pixels wide)
  
  if (number >= 1 && number <= 9) {
    uint8_t* fontData = (uint8_t*)font5x7[countText[0] - 32];
    
    for (int col = 0; col < 5; col++) {
      int x = startX + col;
      if (x >= WIDTH) break;
      
      uint8_t fontCol = pgm_read_byte_near(fontData + col);
      for (int row = 0; row < HEIGHT; row++) {
        if (fontCol & (1 << row)) {
          int idx = getLedIndex(row, x);
          // Use different colors for different numbers
          if (number == 3) {
            strip.setPixelColor(idx, strip.Color(255, 0, 0)); // Red for 3
          } else if (number == 2) {
            strip.setPixelColor(idx, strip.Color(255, 165, 0)); // Orange for 2
          } else if (number == 1) {
            strip.setPixelColor(idx, strip.Color(0, 255, 0)); // Green for 1
          }
        }
      }
    }
  }
  
  strip.show();
}

// Show "GO!" message
void showGo() {
  strip.clear();
  
  // Display "GO" centered
  const char* goText = "GO";
  int startX = (WIDTH - strlen(goText) * 6) / 2;
  if (startX < 0) startX = 0;
  
  for (int charIndex = 0; charIndex < strlen(goText); charIndex++) {
    char c = goText[charIndex];
    if (c >= 32 && c <= 90) {
      uint8_t* fontData = (uint8_t*)font5x7[c - 32];
      
      for (int col = 0; col < 5; col++) {
        int x = startX + charIndex * 6 + col;
        if (x >= WIDTH) break;
        
        uint8_t fontCol = pgm_read_byte_near(fontData + col);
        for (int row = 0; row < HEIGHT; row++) {
          if (fontCol & (1 << row)) {
            int idx = getLedIndex(row, x);
            strip.setPixelColor(idx, strip.Color(0, 255, 0)); // Bright green for GO
          }
        }
      }
    }
  }
  
  strip.show();
}

// DFPlayer Mini Functions
void sendSoftReset() {
  uint8_t resetCmd[] = {
    0x7E, 0xFF, 0x06, 0x0C, 0x00,
    0x00, 0x00, 0xFF, 0xF2, 0xEF
  };
  DFPLAYER_SERIAL.write(resetCmd, sizeof(resetCmd));
}

void sendSetVolume(uint8_t volume) {
  if (volume > 30) volume = 10;
  uint8_t volumeCmd[10] = {
    0x7E, 0xFF, 0x06, 0x06, 0x00,
    0x00, volume, 0x00, 0x00, 0xEF
  };
  
  uint16_t checksum = 0 - (volumeCmd[1] + volumeCmd[2] + volumeCmd[3] + volumeCmd[4] + volumeCmd[5] + volumeCmd[6]);
  volumeCmd[7] = (checksum >> 8) & 0xFF;
  volumeCmd[8] = checksum & 0xFF;
  DFPLAYER_SERIAL.write(volumeCmd, sizeof(volumeCmd));
}

void sendPlayTrack(uint16_t track) {
  uint8_t highByte = (track >> 8) & 0xFF;
  uint8_t lowByte = track & 0xFF;
  uint8_t playCmd[10] = {
    0x7E, 0xFF, 0x06, 0x03, 0x00,
    highByte, lowByte, 0x00, 0x00, 0xEF
  };
  uint16_t checksum = 0 - (playCmd[1] + playCmd[2] + playCmd[3] + playCmd[4] + playCmd[5] + playCmd[6]);
  playCmd[7] = (checksum >> 8) & 0xFF;
  playCmd[8] = checksum & 0xFF;
  DFPLAYER_SERIAL.write(playCmd, sizeof(playCmd));
}

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
  pinMode(SENSOR1_PIN, INPUT);
  pinMode(SENSOR2_PIN, INPUT);
  pinMode(SENSOR3_PIN, INPUT);

  // Initialize NeoPixel LED matrix
  strip.begin();
  strip.setBrightness(100);
  strip.show(); // Initialize all LEDs to off
  
  // Start scrolling text on power up
  scrollText("SMART SHOOTING GALLERY ", strip.Color(123, 150, 255), 90);

  // Initialize DFPlayer Mini
  DFPLAYER_SERIAL.begin(9600);
  delay(200);
  sendSoftReset();    // Soft reset DFPlayer Mini
  delay(500);         // Wait for reset to complete
  sendSetVolume(8);  // Set volume to 25 (out of max 30)
  delay(100);

  randomSeed(analogRead(A0));

  setGameModeSettings("easy", 30, "linear", 10, 1500);

  Serial.println("✅ Arduino Mega Motor Control Ready");
  Serial.println("💡 Waiting for commands from NodeMCU...");
  Serial.println("📋 Available commands: ENABLE_MOTORS, DISABLE_MOTORS, STATUS, TEST_MOTORS");
}

void loop() {
  // Read all three sensors
  int sensor1Value = analogRead(SENSOR1_PIN);
  int sensor2Value = analogRead(SENSOR2_PIN);
  int sensor3Value = analogRead(SENSOR3_PIN);

  static unsigned long lastSensorPrint = 0;
  if (millis() - lastSensorPrint > 5000) {  // Print sensor values every 5 seconds
    Serial.print("Sensor1 (A13): ");
    Serial.print(sensor1Value);
    Serial.print(" | Sensor2 (A14): ");
    Serial.print(sensor2Value);
    Serial.print(" | Sensor3 (A15): ");
    Serial.println(sensor3Value);
    lastSensorPrint = millis();
  }

  // Hit detection logic - only check if SHOT was received from NodeMCU and game is not paused and not during countdown
  if (shotReceived && !gamePaused && gameActive && !countdownActive && millis() - lastHit > hitCooldown) {
    if (sensor1Value > sensorThreshold) {
      Serial.println("💥 Hit Detected on Sensor 1!");
      Serial1.println("HIT1");
      gameScore += 10;  // Hit1 = 10 points
      showHitGreen();
      hitDisplayEnd = millis() + hitDisplayDuration;
      hitShowing = true;
      sendPlayTrack(1);  // Play hit sound
      lastHit = millis();
      shotReceived = false;  // Reset flag after hit detection
    } 
    else if (sensor2Value > sensorThreshold) {
      Serial.println("💥 Hit Detected on Sensor 2!");
      Serial1.println("HIT2");
      gameScore += 5;   // Hit2 = 5 points
      showHitGreen();
      hitDisplayEnd = millis() + hitDisplayDuration;
      hitShowing = true;
      sendPlayTrack(1);  // Play hit sound
      lastHit = millis();
      shotReceived = false;  // Reset flag after hit detection
    } 
    else if (sensor3Value > sensorThreshold) {
      Serial.println("💥 Hit Detected on Sensor 3!");
      Serial1.println("HIT3");
      gameScore += 2;   // Hit3 = 2 points
      showHitGreen();
      hitDisplayEnd = millis() + hitDisplayDuration;
      hitShowing = true;
      sendPlayTrack(1);  // Play hit sound
      lastHit = millis();
      shotReceived = false;  // Reset flag after hit detection
    }
  }

  // Handle commands from Serial (USB) or Serial1 (NodeMCU)
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

  // Handle countdown logic
  if (countdownActive) {
    unsigned long elapsed = millis() - countdownStart;
    
    if (elapsed < 1000) {
      // Show "3" for first second
      if (countdownNumber != 3) {
        countdownNumber = 3;
        showCountdown(3);
      }
    } else if (elapsed < 2000) {
      // Show "2" for second second
      if (countdownNumber != 2) {
        countdownNumber = 2;
        showCountdown(2);
      }
    } else if (elapsed < 3000) {
      // Show "1" for third second
      if (countdownNumber != 1) {
        countdownNumber = 1;
        showCountdown(1);
      }
    } else if (elapsed < 4000) {
      // Show "GO!" for fourth second
      if (countdownNumber != 0) {
        countdownNumber = 0;
        showGo();
      }
    } else {
      // Countdown finished, start the actual game
      countdownActive = false;
      gameActive = true;
      enableMotors();
      showScore(gameScore, strip.Color(255, 255, 0));
      lastScoreUpdate = millis();
      Serial.println("🎮 Countdown finished - Game started!");
    }
  }

  // Update motors if enabled and game active (but not during countdown)
  if (motorsEnabled && gameActive && !gamePaused && !countdownActive) {
    updateMotorMovement();
  }

  // Clear hit display after duration
  if (hitShowing && millis() >= hitDisplayEnd) {
    hitShowing = false;
    // Show score again after hit display
    if (gameActive) {
      showScore(gameScore, strip.Color(255, 255, 0));
    } else {
      // Clear display
      for (int i = 0; i < NUM_LEDS; i++) {
        strip.setPixelColor(i, strip.Color(0, 0, 0));
      }
      strip.show();
    }
  }

  // FIXED: Show score periodically when game is active and not showing hit and not during countdown - static display
  if (gameActive && !hitShowing && !gamePaused && !countdownActive) {
    if (millis() - lastScoreUpdate >= scoreUpdateInterval) {
      lastScoreUpdate = millis();
      showScore(gameScore, strip.Color(255, 255, 0));
    }
  }

  // Show scrolling text only at startup (before game mode chosen) or after game ends (never during pause or countdown)
  if (!gameActive && !hitShowing && !gamePaused && !gameModeChosen && !countdownActive) {
    static unsigned long lastScrollTime = 0;
    if (millis() - lastScrollTime > 5000) {  // Scroll every 5 seconds when inactive
      scrollText("SMART SHOOTING GALLERY ", strip.Color(123, 150, 255), 90);
      lastScrollTime = millis();
    }
  }
  
  // Keep pause symbol displayed when paused (and not during countdown)
  if (gamePaused && !hitShowing && !countdownActive) {
    static unsigned long lastPauseCheck = 0;
    if (millis() - lastPauseCheck > 1000) {  // Refresh pause display every second
      showPause();
      lastPauseCheck = millis();
    }
  }

  delay(1);
}

void processCommand(String command) {
  Serial.println("📥 Received: " + command);

  if (command == "ENABLE_MOTORS") {
    enableMotors();
    gameActive = true;
    Serial.println("🚀 Motors enabled via command");
  }
  else if (command == "DISABLE_MOTORS") {
    disableMotors();
    gameActive = false;
    Serial.println("🛑 Motors disabled via command");
  }
  else if (command == "GAME_START") {
    gameStarted = true;
    gamePaused = false;
    gameModeChosen = true;  // Mark that game mode has been chosen and game started
    gameScore = 0;  // Reset score when starting new game
    
    // Start countdown instead of game immediately
    countdownActive = true;
    gameActive = false;  // Don't start game yet
    countdownStart = millis();
    countdownNumber = 3; // Start with 3
    showCountdown(3);
    
    Serial.println("🎮 Game start requested - Starting countdown...");
  }
  else if (command == "GAME_STOP") {
    gameActive = false;
    gameStarted = false;
    gamePaused = false;
    countdownActive = false;  // Stop countdown if active
    gameModeChosen = false;  // Reset to allow scrolling again after game ends
    disableMotors();
    // Clear any hit display and start scrolling again
    hitShowing = false;
    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, strip.Color(0, 0, 0));
    }
    strip.show();
    Serial.println("⏹ Game stopped via command - Final Score: " + String(gameScore));
  }
  else if (command == "GAME_PAUSE") {
    gamePaused = true;
    // If countdown is active, pause it
    if (countdownActive) {
      countdownActive = false;
    }
    showPause();
    Serial.println("⏸ Game paused via command");
  }
  else if (command == "GAME_RESUME") {
    gamePaused = false;
    // If we were in the middle of countdown when paused, restart countdown
    if (gameStarted && !gameActive) {
      countdownActive = true;
      countdownStart = millis();
      countdownNumber = 3;
      showCountdown(3);
      Serial.println("▶ Game resumed - Restarting countdown...");
    } else if (gameActive) {
      // Resume normal game
      showScore(gameScore, strip.Color(255, 255, 0));
      lastScoreUpdate = millis(); // Reset score update timer
      Serial.println("▶ Game resumed via command");
    }
  }
  else if (command == "GAME_RESET") {
    resetGame();
    gameStarted = false;
    gamePaused = false;
    countdownActive = false;  // Stop countdown if active
    gameModeChosen = false;  // Reset to allow scrolling again after game reset
    gameScore = 0;  // Reset score
    hitShowing = false;
    // Clear display and will start scrolling again
    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, strip.Color(0, 0, 0));
    }
    strip.show();
    Serial.println("🔄 Game reset via command - Score reset to 0");
  }
  else if (command.startsWith("MODE:easy")) {
    setGameModeSettings("easy", 30, "linear", 10, 1500);
    gameModeChosen = true;  // Mark that game mode has been chosen
    Serial.println("✅ Switched to EASY mode");
  }
  else if (command.startsWith("MODE:medium")) {
    setGameModeSettings("medium", 50, "wave", 20, 1200);
    gameModeChosen = true;  // Mark that game mode has been chosen
    Serial.println("✅ Switched to MEDIUM mode");
  }
  else if (command.startsWith("MODE:hard")) {
    setGameModeSettings("hard", 80, "random", 30, 800);
    gameModeChosen = true;  // Mark that game mode has been chosen
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
    Serial.println("  Current Score: " + String(gameScore));
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
      stepMotor(X_STEP_PIN, 500);
      delay(20);
    }
    
    Serial.println("Testing Y motor (50 steps)...");
    for (int i = 0; i < 50; i++) {
      stepMotor(Y_STEP_PIN, 500);
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
  else if (command == "SHOT") {
    Serial.println("🎯 SHOT received from NodeMCU - Ready to detect hits");
    shotReceived = true;  // Set flag to enable hit detection
  }
  else {
    Serial.println("❓ Unknown command format: " + command);
  }
}

void setGameModeSettings(String gameMode, int motorSpeed, String pattern, int acceleration, int targetSpeed) {
  currentGameMode = gameMode;
  currentSettings.motorSpeed = motorSpeed;
  currentSettings.pattern = pattern;
  currentSettings.acceleration = acceleration;
  currentSettings.targetSpeed = targetSpeed;

  // Map motorSpeed to different intervals for each mode
  if (gameMode == "easy") {
    // Keep EASY mode exactly as you want it - UNCHANGED
    xStepInterval = map(motorSpeed, 30, 80, 3000, 1000);  // Smoother timing for EASY mode
  }
  else if (gameMode == "medium") {
    // Much slower speeds for very smooth MEDIUM mode
    xStepInterval = map(motorSpeed, 30, 80, 5000, 2500);  // Much slower X-axis for smoothness
    yStepInterval = map(motorSpeed, 30, 80, 5200, 2700);  // Much slower Y-axis for smoothness
  }
  else if (gameMode == "hard") {
    // Very slow speeds for quiet HARD mode
    stepInterval = map(motorSpeed, 30, 80, 25, 15);  // Increased from (15-8) to (25-15) ms for quieter operation
  }

  lastRandomToggle = millis();
  lastStep = millis();
  lastXStep = micros();  // Initialize X-axis timing
  lastYStep = micros();  // Initialize Y-axis timing

  if (pattern == "random") {
    xDirection = random(0, 2) ? HIGH : LOW;
    yDirection = random(0, 2) ? HIGH : LOW;
    digitalWrite(X_DIR_PIN, xDirection);
    digitalWrite(Y_DIR_PIN, yDirection);
  }

  Serial.println("🎯 Game mode configured:");
  Serial.println("  Mode: " + gameMode);
  Serial.println("  Motor speed: " + String(motorSpeed));
  
  if (gameMode == "easy") {
    Serial.println("  X-axis step interval: " + String(xStepInterval) + "us (Perfect as requested)");
  }
  else if (gameMode == "medium") {
    Serial.println("  X-axis step interval: " + String(xStepInterval) + "us (Very Smooth & Quiet)");
    Serial.println("  Y-axis step interval: " + String(yStepInterval) + "us (Very Smooth & Quiet)");
  }
  else if (gameMode == "hard") {
    Serial.println("  Step interval: " + String(stepInterval) + "ms (Very Quiet)");
  }
  
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
  lastXStep = micros();
  lastYStep = micros();
  shotReceived = false;  // Reset shot flag on game reset

  Serial.println("🔄 Game reset");
}

void updateMotorMovement() {
  if (currentSettings.pattern == "linear") {
    updateLinearMovement();  // EASY mode - unchanged
  } else if (currentSettings.pattern == "wave") {
    updateWaveMovement();    // MEDIUM mode - now smooth with microsecond timing
  } else if (currentSettings.pattern == "random") {
    if (millis() - lastStep >= stepInterval) {
      lastStep = millis();
      updateRandomMovement(); // HARD mode - now slower and smoother
    }
  }
}

void updateRandomMovement() {
  const int hardModeStepDelay = 1000; // Increased from 600 to 1000 for much quieter operation

  if (millis() - lastRandomToggle > randomInterval) {
    xDirection = random(0, 2) ? HIGH : LOW;
    yDirection = random(0, 2) ? HIGH : LOW;
    digitalWrite(X_DIR_PIN, xDirection);
    digitalWrite(Y_DIR_PIN, yDirection);
    lastRandomToggle = millis();
    Serial.println("🎲 HARD: Quiet random direction change");
  }

  checkLimitSwitchToggle(X_LIMIT_SWITCH_PIN, xSwitchPrev, xDirection, X_DIR_PIN);
  checkLimitSwitchToggle(Y_LIMIT_SWITCH_PIN, ySwitchPrev, yDirection, Y_DIR_PIN);

  // Much quieter step pulses for HARD mode
  digitalWrite(X_STEP_PIN, HIGH);
  digitalWrite(Y_STEP_PIN, HIGH);
  delayMicroseconds(8);  // Longer stable pulse width for quieter operation
  digitalWrite(X_STEP_PIN, LOW);
  digitalWrite(Y_STEP_PIN, LOW);
  delayMicroseconds(hardModeStepDelay);
}

void stepMotor(int pin, int speedDelay) {
  digitalWrite(pin, HIGH);
  delayMicroseconds(speedDelay);
  digitalWrite(pin, LOW);
  delayMicroseconds(speedDelay);
}

void stepMotor(int pin) {
  stepMotor(pin, 500);
}

void updateLinearMovement() {
  // EASY mode - Keep exactly as you want it - UNCHANGED
  if (micros() - lastXStep >= xStepInterval) {
    lastXStep = micros();
    
    // Check limit switch and reverse direction if needed
    checkLimitSwitchToggle(X_LIMIT_SWITCH_PIN, xSwitchPrev, xDirection, X_DIR_PIN);
    
    // Smooth step pulse
    digitalWrite(X_STEP_PIN, HIGH);
    delayMicroseconds(2);  // Short pulse width for smooth operation
    digitalWrite(X_STEP_PIN, LOW);
    
    static unsigned long stepCount = 0;
    if (++stepCount % 1000 == 0) {
      Serial.println("🔄 EASY: Perfect smooth X-axis movement");
    }
  }
}

void updateWaveMovement() {
  // MEDIUM mode - Much smoother with slower microsecond timing
  
  // X-axis movement
  if (micros() - lastXStep >= xStepInterval) {
    lastXStep = micros();
    checkLimitSwitchToggle(X_LIMIT_SWITCH_PIN, xSwitchPrev, xDirection, X_DIR_PIN);
    
    // Very smooth step pulse for X-axis
    digitalWrite(X_STEP_PIN, HIGH);
    delayMicroseconds(5);  // Longer pulse width for stability and quieter operation
    digitalWrite(X_STEP_PIN, LOW);
  }
  
  // Y-axis movement (slightly different timing for wave effect)
  if (micros() - lastYStep >= yStepInterval) {
    lastYStep = micros();
    checkLimitSwitchToggle(Y_LIMIT_SWITCH_PIN, ySwitchPrev, yDirection, Y_DIR_PIN);
    
    // Very smooth step pulse for Y-axis
    digitalWrite(Y_STEP_PIN, HIGH);
    delayMicroseconds(5);  // Longer pulse width for stability and quieter operation
    digitalWrite(Y_STEP_PIN, LOW);
    
    static unsigned long stepCount = 0;
    if (++stepCount % 1500 == 0) {
      Serial.println("🔄 MEDIUM: Very smooth & quiet wave movement");
    }
  }
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
    Serial.println("EASY (X-axis motor only - Perfect smooth movement)");
  } else if (currentGameMode == "medium") {
    Serial.println("MEDIUM (Both X & Y motors - Very smooth & quiet wave movement)");
  } else if (currentGameMode == "hard") {
    Serial.println("HARD (Random movement - Very quiet operation)");
  }
}
