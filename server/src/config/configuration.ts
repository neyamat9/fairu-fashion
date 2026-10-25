export default () => ({
  app: {
    port: parseInt(process.env.PORT || '8000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  security: {
    apiKey: process.env.API_KEY,
    // Encrypts secret settings (SMTP password, Resend key) in the database.
    // Falls back to JWT_SECRET. Changing it means re-entering those secrets.
    settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY,
    // Required in production to use POST /admin/auth/seed-admin (sent in the
    // x-seed-secret header). Without it the endpoint is disabled in production.
    adminSeedSecret: process.env.ADMIN_SEED_SECRET,
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          'http://localhost:5174',
        ],
  },

  graphql: {
    playground: process.env.GRAPHQL_PLAYGROUND === 'true',
    introspection: process.env.GRAPHQL_INTROSPECTION === 'true',
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false', // default to true
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    refreshSecret: process.env.JWT_SECRET_REFRESH || 'your-refresh-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  // Storefront URL, used to build links in emails (e.g. password reset).
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    resetPasswordPath: process.env.RESET_PASSWORD_PATH || '/reset-password',
    // Admin dashboard (reset links for the admin account point here)
    adminUrl:
      process.env.ADMIN_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173',
    adminResetPasswordPath:
      process.env.ADMIN_RESET_PASSWORD_PATH || '/reset-password',
  },

  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || 'Fairu Fashion <no-reply@fairufashion.com>',
  },

  passwordReset: {
    tokenTtlMinutes: parseInt(
      process.env.PASSWORD_RESET_TTL_MINUTES || '30',
      10,
    ),
  },

  activityLog: {
    // Everything older than this is deleted (days)
    retentionDays: Math.max(
      1,
      parseInt(process.env.ACTIVITY_LOG_RETENTION_DAYS || '365', 10),
    ),
    // Short-lived events (cart, wishlist, previews) are kept for less (days)
    behaviorRetentionDays: Math.max(
      1,
      parseInt(process.env.ACTIVITY_LOG_BEHAVIOR_RETENTION_DAYS || '30', 10),
    ),
    // Also log admin page views (GET). Exports/invoices are always logged.
    logAdminReads: process.env.ACTIVITY_LOG_ADMIN_READS === 'true',
  },

  uploads: {
    // Where uploaded files are stored on disk. Use a persistent volume in
    // production (container file systems are wiped on redeploy).
    dir: process.env.UPLOAD_DIR || 'uploads',
    // Prefix for file URLs returned by the API, e.g. https://api.shop.com
    // (no trailing slash). Empty = relative URLs like /uploads/reviews/x.webp.
    publicBaseUrl: (process.env.UPLOADS_PUBLIC_URL || '').replace(/\/$/, ''),
    // How often unused uploads are cleaned up (ms). Default: every hour.
    cleanupIntervalMs: Math.max(
      1000,
      parseInt(process.env.UPLOAD_CLEANUP_INTERVAL_MS || '3600000', 10),
    ),
    // Uploads that were never attached are deleted after this many ms (24 h).
    unattachedTtlMs: Math.max(
      1000,
      parseInt(process.env.UPLOAD_UNATTACHED_TTL_MS || '86400000', 10),
    ),
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
  },
});
