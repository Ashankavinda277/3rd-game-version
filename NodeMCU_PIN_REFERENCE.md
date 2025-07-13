# NodeMCU ESP8266 Pin Reference & Wiring Guide

## Pin Naming Corrections Made:

### ❌ Previous Confusing Names:
- `MEGA_RX_PIN` and `MEGA_TX_PIN` - These were confusing because they described the Arduino pins, not the NodeMCU pins

### ✅ Corrected Names:
- `NODEMCU_RX_PIN` and `NODEMCU_TX_PIN` - These clearly describe the NodeMCU perspective

## Pin Configuration:

```cpp
#define NODEMCU_RX_PIN 14  // NodeMCU D5 (GPIO14) <- Arduino Mega TX1 (Pin 18)
#define NODEMCU_TX_PIN 12  // NodeMCU D6 (GPIO12) -> Arduino Mega RX1 (Pin 19)
```

## Wiring Diagram:

```
NodeMCU ESP8266           Arduino Mega 2560
┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │
│  D5 (GPIO14) ───┼──────┼─── TX1 (Pin 18) │ (NodeMCU RX ← Mega TX)
│  D6 (GPIO12) ───┼──────┼─── RX1 (Pin 19) │ (NodeMCU TX → Mega RX)
│  GND         ───┼──────┼─── GND          │ (Common Ground)
│  3V3         ───┼──────┼─── 3.3V         │ (Optional - Power)
│                 │      │                 │
└─────────────────┘      └─────────────────┘
```

## NodeMCU Pin Mapping Reference:

| NodeMCU Label | GPIO Number | Function in Our Project |
|---------------|-------------|-------------------------|
| D0            | GPIO16      | Not Used               |
| D1            | GPIO5       | Not Used               |
| D2            | GPIO4       | Not Used               |
| D3            | GPIO0       | Not Used               |
| D4            | GPIO2       | Not Used               |
| D5            | GPIO14      | **RX from Arduino**    |
| D6            | GPIO12      | **TX to Arduino**      |
| D7            | GPIO13      | Not Used               |
| D8            | GPIO15      | Not Used               |

## SoftwareSerial Constructor:
```cpp
SoftwareSerial megaSerial(NODEMCU_RX_PIN, NODEMCU_TX_PIN);
//                       ^RX_pin        ^TX_pin
//                       GPIO14         GPIO12
//                       D5             D6
```

## Communication Flow:

1. **Frontend** → WebSocket → **NodeMCU** → Serial → **Arduino Mega**
2. **Arduino Mega** → Serial → **NodeMCU** → WebSocket → **Backend** → **Frontend**

## Baud Rate:
- Both NodeMCU and Arduino Mega use **9600 baud**
- Ensure both ends are configured identically

## Key Points:
1. **RX/TX are always from the device's perspective**
2. **NodeMCU RX** connects to **Arduino TX**
3. **NodeMCU TX** connects to **Arduino RX**
4. **Common ground is essential** for communication
5. Use **SoftwareSerial** on NodeMCU since hardware Serial is used for USB debugging

## Testing Commands:
- Arduino sends: `HELLO_FROM_NODEMCU` (test message)
- NodeMCU responds: Various debug messages
- Motor commands: `ENABLE_MOTORS`, `DISABLE_MOTORS`, `STATUS`, `TEST_MOTORS`
