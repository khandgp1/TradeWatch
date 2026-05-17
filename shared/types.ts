export interface Candle {
  id: number;
  open_time: string; // YYYY-MM-DD HH:MM
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  created_at: string;
}

export type SignalRule =
  | 'Three Green Candles'
  | 'Close Above Prev High'
  | 'Close Above Post-Signal Peak';

export type SignalStatus = 'Ongoing' | 'Broken';

export interface Signal {
  id: number;
  start_time: string; // YYYY-MM-DD HH:MM
  end_time: string; // YYYY-MM-DD HH:MM
  rule: SignalRule;
  indicator: number;
  indicator_candle_time: string;
  status: SignalStatus;
  created_at: string;
  updated_at: string;
}

export interface EngineState {
  id: number;
  last_processed_time: string | null;
  rule1_green_streak: number;
  rule1_streak_start_index: string | null;
  last_accepted_end: string | null;
  state_json: string | null;
}

export interface NewCandleEvent {
  candle: Candle;
}

export interface NewSignalEvent {
  signal: Signal;
}

export interface SignalUpdatedEvent {
  id: number;
  status: SignalStatus;
  end_time: string;
}

export interface EngineStatusEvent {
  lastProcessed: string | null;
  nextFetch: string | null;
}
