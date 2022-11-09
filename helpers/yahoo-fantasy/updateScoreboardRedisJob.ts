import { addPoints, collectTransactions } from "./mod.ts";
import {cron} from 'https://deno.land/x/deno_cron/cron.ts';

cron('1 */5 19-23 * * 1,4', () => {
    console.log(new Date(), 'Getting Points');
    addPoints();
});

cron('1 */5 9-23 * * 0', () => {
    console.log(new Date(), 'Getting Points');
    addPoints();
});

// Run every hour
cron('1 0 * * * *', () => {
    console.log(new Date(), 'Collecting Transactions');
    collectTransactions();
});

console.log('Cron Loaded');