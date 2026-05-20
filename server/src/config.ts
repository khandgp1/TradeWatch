export const config = {
  // The date/time to start fetching candles from (UTC)
  startTime: '2026-05-19 10:00',

  // Binance trading pair — fixed to BTCUSDT
  symbol: 'BTCUSDT',

  // Candle interval
  interval: '1h',

  // Server port
  port: 3001,

  // Database file path (relative to server root)
  dbPath: './data/alerting.db',

  // Toggle to enable/disable Telegram alerts
  enableTelegramAlerts: true,
} as const;
