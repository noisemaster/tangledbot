import { addPoints, collectTransactions } from "./mod.ts";
import { CronJob } from "cron";

// cron('1 */5 19-23 * * 1,4', () => {
//     console.log(new Date(), 'Getting Points');
//     addPoints();
// });

// cron('1 */5 9-23 * * 0', () => {
//     console.log(new Date(), 'Getting Points');
//     addPoints();
// });

// Run every 15 minutes
new CronJob('1 */5 * * * *', () => {
    console.log(new Date(), 'Collecting Transactions');
    collectTransactions();
});

console.log('Cron Loaded');
