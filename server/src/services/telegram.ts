import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isEnvInitialized = false;

/**
 * Robustly load environment variables from the .env file.
 * Searches multiple fallback paths depending on how the application is executed.
 */
function initEnv() {
  if (isEnvInitialized) return;

  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'server/.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        process.loadEnvFile(p);
        console.log(`[Telegram] Successfully loaded environment configuration from: ${p}`);
        isEnvInitialized = true;
        return;
      } catch (err) {
        console.warn(`[Telegram] Found env file at ${p} but failed to load:`, err);
      }
    }
  }

  console.warn('[Telegram] Warning: Could not locate server/.env file.');
  isEnvInitialized = true; // Set to true to avoid spamming searches on every alert
}

/**
 * Broadcasts a trading signal to Telegram in a fire-and-forget manner.
 */
export function broadcastSignal(signal: any): void {
  // Gated by the developer config toggle
  if (!config.enableTelegramAlerts) {
    return;
  }

  // IIFE to run the async network request in the background
  (async () => {
    try {
      initEnv();

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!botToken || botToken === 'your_bot_token_here') {
        console.error('[Telegram] Error: TELEGRAM_BOT_TOKEN is not configured in .env file.');
        return;
      }

      if (!chatId || chatId === 'your_chat_id_here') {
        console.error('[Telegram] Error: TELEGRAM_CHAT_ID is not configured in .env file.');
        return;
      }

      // Format price cleanly
      const priceStr = typeof signal.indicator === 'number'
        ? signal.indicator.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : signal.indicator;

      // Parse the input time as UTC (e.g. '2026-05-20 15:00' -> '2026-05-20T15:00Z')
      let date: Date;
      if (signal.start_time) {
        const formattedStr = signal.start_time.includes('T')
          ? signal.start_time
          : signal.start_time.replace(' ', 'T');
        const utcStr = formattedStr.endsWith('Z') ? formattedStr : `${formattedStr}Z`;
        date = new Date(utcStr);
      } else {
        date = new Date();
      }

      // Convert to America/New_York (EDT/EST) timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(date);
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
      const edtTimeStr = `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}`;

      // Format final markdown string
      const message = `🟢 *TradeWatch LONG Alert* 🟢\n\n` +
        `📈 *Asset:* ${config.symbol}\n` +
        `⏰ *Time:* ${edtTimeStr} (EDT)\n` +
        `💰 *Price:* $${priceStr}\n` +
        `📋 *Rule:* ${signal.rule}`;

      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json() as any;

      if (response.ok && result.ok) {
        console.log(`[Telegram] Alert broadcasted successfully for Signal ID: ${signal.id}`);
      } else {
        console.error('[Telegram] Failed to send message. Telegram response:', JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('[Telegram] Connection error sending message:', error instanceof Error ? error.message : error);
    }
  })();
}
