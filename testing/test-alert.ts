import { broadcastSignal } from '../server/src/services/telegram';

const dummySignal = {
  id: 999,
  start_time: '2026-05-20 15:00',
  indicator: 69420.00,
  rule: 'Three Green Candles (Dummy Test Alert)',
};

console.log('Sending dummy signal to the TradeWatch Telegram service...');
broadcastSignal(dummySignal);
console.log('Broadcast has been triggered in the background. Check your Telegram client!');
