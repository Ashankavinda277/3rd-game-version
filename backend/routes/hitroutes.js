const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  console.log("📩 Received HIT from WebSocket API Bridge:");
  console.log("Payload:", req.body);

  return res.status(200).json({ message: '✅ HIT data received successfully' });
});

// Test endpoint for debugging
router.get('/test', (req, res) => {
  console.log("🧪 Hit route test endpoint called");
  return res.status(200).json({ 
    message: '✅ Hit route is working!',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

module.exports = router;