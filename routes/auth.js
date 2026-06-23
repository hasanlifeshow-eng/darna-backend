// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { users } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const AVATAR_COLORS = ['#D97757','#5B8C8C','#8C6B5B','#6B8C5B','#7A5B8C','#8C5B7A','#5B7A8C'];

function publicUser(u) {
  return { id: u._id || u.id, username: u.username, displayName: u.displayName, avatarColor: u.avatarColor };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, displayName, password, inviteCode } = req.body;
  if (!username || !displayName || !password)
    return res.status(400).json({ error: 'لازم تملأ كل الحقول' });
  if (password.length < 6)
    return res.status(400).json({ error: 'كلمة السر لازم تكون 6 حروف على الأقل' });

  const requiredCode = process.env.FAMILY_INVITE_CODE;
  if (requiredCode && inviteCode !== requiredCode)
    return res.status(403).json({ error: 'كود دعوة العائلة غير صحيح' });

  const cleanUsername = username.trim().toLowerCase();
  try {
    const existing = await users.findOne({ username: cleanUsername });
    if (existing) return res.status(409).json({ error: 'اسم المستخدم ده موجود بالفعل' });

    const newUser = {
      _id: uuidv4(),
      username: cleanUsername,
      displayName: displayName.trim(),
      passwordHash: bcrypt.hashSync(password, 10),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      createdAt: new Date().toISOString()
    };
    await users.insert(newUser);
    const token = signToken({ id: newUser._id, username: newUser.username, displayName: newUser.displayName });
    res.json({ token, user: publicUser(newUser) });
  } catch (e) {
    res.status(500).json({ error: 'حصل خطأ أثناء التسجيل' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'لازم تكتب اسم المستخدم وكلمة السر' });
  try {
    const user = await users.findOne({ username: username.trim().toLowerCase() });
    if (!user || !bcrypt.compareSync(password, user.passwordHash))
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غلط' });
    const token = signToken({ id: user._id, username: user.username, displayName: user.displayName });
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    res.status(500).json({ error: 'حصل خطأ أثناء تسجيل الدخول' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await users.findOne({ _id: req.user.id });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ user: publicUser(user) });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// GET /api/auth/family
router.get('/family', requireAuth, async (req, res) => {
  try {
    const allUsers = await users.find({});
    res.json({ users: allUsers.map(publicUser) });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

module.exports = router;
