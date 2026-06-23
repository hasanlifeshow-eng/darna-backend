// routes/messages.js
const express = require('express');
const { messages } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:roomId
router.get('/:roomId', requireAuth, async (req, res) => {
  const { roomId } = req.params;
  const before = req.query.before ? new Date(req.query.before).getTime() : Date.now();
  const limit  = Math.min(parseInt(req.query.limit) || 30, 100);

  try {
    const msgs = await messages
      .find({ roomId, createdAt: { $lt: new Date(before).toISOString() } })
      .sort({ createdAt: 1 })
      .limit(limit);

    // نرجع آخر `limit` رسالة
    res.json({ messages: msgs.slice(-limit) });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في جلب الرسائل' });
  }
});

module.exports = router;
