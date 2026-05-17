import { EventEmitter } from 'node:events';
import { NewCandleEvent, NewSignalEvent, SignalUpdatedEvent } from '@tradewatch/shared';

class AppEvents extends EventEmitter {
  emit(event: 'new-candle', payload: NewCandleEvent): boolean;
  emit(event: 'new-signal', payload: NewSignalEvent): boolean;
  emit(event: 'signal-updated', payload: SignalUpdatedEvent): boolean;
  emit(event: string | symbol, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: 'new-candle', listener: (payload: NewCandleEvent) => void): this;
  on(event: 'new-signal', listener: (payload: NewSignalEvent) => void): this;
  on(event: 'signal-updated', listener: (payload: SignalUpdatedEvent) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}

export const appEvents = new AppEvents();
