import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const candles = sqliteTable('candles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  open_time: text('open_time').notNull().unique(),
  open: real('open').notNull(),
  high: real('high').notNull(),
  low: real('low').notNull(),
  close: real('close').notNull(),
  volume: real('volume').notNull(),
  created_at: text('created_at').notNull(),
});

export const signals = sqliteTable('signals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  start_time: text('start_time').notNull(),
  end_time: text('end_time').notNull(),
  rule: text('rule').notNull(),
  indicator: real('indicator').notNull(),
  indicator_candle_time: text('indicator_candle_time').notNull(),
  status: text('status').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const engineState = sqliteTable('engine_state', {
  id: integer('id').primaryKey(),
  last_processed_time: text('last_processed_time'),
  rule1_green_streak: integer('rule1_green_streak').notNull().default(0),
  rule1_streak_start_index: text('rule1_streak_start_index'),
  last_accepted_end: text('last_accepted_end'),
  state_json: text('state_json'),
});
