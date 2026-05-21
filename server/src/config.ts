export const config = {
  // The date/time to start fetching candles from (UTC)
  startTime: process.env.TW_START_TIME || '2026-05-19 10:00',

  // Binance trading pair — fixed to BTCUSDT
  symbol: 'BTCUSDT',

  // Candle interval
  interval: '1h',

  // Server port
  port: parseInt(process.env.PORT || '3001', 10),

  // Database file path (relative to server root)
  dbPath: process.env.TW_DB_PATH || './data/alerting.db',

  // Toggle to enable/disable Telegram alerts
  enableTelegramAlerts: process.env.TW_TELEGRAM_ENABLED !== undefined ? process.env.TW_TELEGRAM_ENABLED === 'true' : true,
} as const;
