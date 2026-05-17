import { backfill } from '../services/candleFetcher';

async function main() {
  try {
    console.log('Starting historical candle backfill...');
    const result = await backfill();
    console.log('\n--- Backfill Summary ---');
    console.log(`Time Range: ${result.range}`);
    console.log(`Total Fetched: ${result.fetched}`);
    console.log(`Total Inserted: ${result.inserted}`);
    console.log('------------------------\n');
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
}

main();
