require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const { verifySocketToken } = require('./middleware/auth');
const { messages }          = require('./db');
const authRoutes            = require('./routes/auth');
const messageRoutes         = require('./routes/messages');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const PORT   = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/auth',     authRoutes);
app.use('/api/messages', messageRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── حالة الاتصالات في الذاكرة ──
const onlineUsers = new Map(); // userId -> Set<socketId>

function broadcast(event, data) { io.emit(event, data); }

function emitToUser(userId, event, payload) {
  const sockets = onlineUsers.get(userId);
  if (sockets) sockets.forEach(sid => io.to(sid).emit(event, payload));
}

function dmRoomId(a, b) { return 'dm_' + [a, b].sort().join('_'); }

// ── مصادقة Socket ──
io.use((socket, next) => {
  const payload = verifySocketToken(socket.handshake.auth?.token);
  if (!payload) return next(new Error('unauthorized'));
  socket.user = payload;
  next();
});

io.on('connection', (socket) => {
  const uid = socket.user.id;

  if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set());
  onlineUsers.get(uid).add(socket.id);
  socket.join('family');
  broadcast('presence:update', { onlineUserIds: [...onlineUsers.keys()] });

  socket.on('room:join', ({ roomId }) => { if (roomId) socket.join(roomId); });

  socket.on('dm:open', ({ otherUserId }) => {
    const roomId = dmRoomId(uid, otherUserId);
    socket.join(roomId);
    socket.emit('dm:room', { roomId, otherUserId });
  });

  socket.on('message:send', async (data, ack) => {
    const { roomId, content } = data || {};
    if (!roomId || !content?.trim()) return;

    const msg = {
      _id:        uuidv4(),
      roomId,
      senderId:   uid,
      senderName: socket.user.displayName,
      type:       'text',
      content:    content.trim(),
      createdAt:  new Date().toISOString()
    };

    await messages.insert(msg);
    // نبعته للعيلة بـ id (مش _id) عشان الواجهة متتخنقش
    const payload = { ...msg, id: msg._id };
    io.to(roomId).emit('message:new', payload);
    if (typeof ack === 'function') ack({ ok: true, message: payload });
  });

  socket.on('typing:start', ({ roomId }) => {
    socket.to(roomId).emit('typing:update', { roomId, userId: uid, typing: true });
  });
  socket.on('typing:stop', ({ roomId }) => {
    socket.to(roomId).emit('typing:update', { roomId, userId: uid, typing: false });
  });

  socket.on('disconnect', () => {
    const sockets = onlineUsers.get(uid);
    if (sockets) { sockets.delete(socket.id); if (!sockets.size) onlineUsers.delete(uid); }
    broadcast('presence:update', { onlineUserIds: [...onlineUsers.keys()] });
  });
});

server.listen(PORT, () => console.log(`✅ دارنا شغّالة على المنفذ ${PORT}`));
