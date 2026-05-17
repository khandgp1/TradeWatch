import { backfill } from '../services/candleFetcher';

async function main() {
  try {
    console.log('Starting historical candle backfill and signal detection...');
    const result = await backfill();
    console.log('\n--- Backfill & Engine Summary ---');
    console.log(`Time Range: ${result.range}`);
    console.log(`Total Fetched: ${result.fetched}`);
    console.log(`Total Inserted: ${result.inserted}`);
    console.log(`Total Processed by Engine: ${result.processed}`);
    console.log(`Total Signals in DB: ${result.signalsCount}`);
    console.log(`  ├── Rule 1 (Three Green Candles): ${result.rule1Count}`);
    console.log(`  ├── Rule 2 (Close Above Prev High): ${result.rule2Count}`);
    console.log(`  └── Rule 3 (Close Above Post-Signal Peak): ${result.rule3Count}`);
    console.log('---------------------------------\n');
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
}

main();
