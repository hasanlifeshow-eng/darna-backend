// ecosystem.config.js — إعدادات تشغيل السيرفر بشكل دائم باستخدام PM2
// PM2 بيخلي السيرفر يشتغل في الخلفية، ويرجع يشتغل تاني تلقائياً لو الجهاز اتعمله إعادة تشغيل أو السيرفر وقع لأي سبب

module.exports = {
  apps: [{
    name: 'darna-backend',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
