const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  console.log("📩 Received HIT from WebSocket API Bridge:");
  console.log("Payload:", req.body);

  return res.status(200).json({ message: '✅ HIT data received successfully' });
});

module.exports = router;