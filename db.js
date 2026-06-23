// db.js — قاعدة بيانات مدمجة باستخدام NeDB (تعمل على Railway وأي سيرفر بدون إعداد)
const Datastore = require('nedb-promises');
const path = require('path');
const fs = require('fs');

// على Railway: DATA_DIR يكون /data لو في volume، وإلا نستخدم مجلد محلي
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const users    = Datastore.create({ filename: path.join(dataDir, 'users.db'),    autoload: true });
const messages = Datastore.create({ filename: path.join(dataDir, 'messages.db'), autoload: true });

// فهارس لتسريع البحث
users.ensureIndex({ fieldName: 'username', unique: true });
messages.ensureIndex({ fieldName: 'roomId' });
messages.ensureIndex({ fieldName: 'createdAt' });

module.exports = { users, messages };
