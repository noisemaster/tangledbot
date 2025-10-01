import { addPoints, collectTransactions } from "./mod.ts";
import { Cron } from "croner";

// new Cron('1 */5 19-23 * * 1,4',
//   {
//     catch: (err) => console.error(err),
//   },
//  () => {
//     console.log(new Date(), 'Getting Points');
//     addPoints();
// });
//
// new Cron('1 */5 9-23 * * 0',
//   {
//     catch: (err) => console.error(err),
//   }
//   , () => {
//     console.log(new Date(), 'Getting Points');
//     addPoints();
// });

// Run every 15 minutes
new Cron(
  "1 */5 * * * *",
  {
    catch: (err) => console.error(err),
  },
  () => {
    console.log(new Date(), "Collecting Transactions");
    collectTransactions();
  },
);

console.log("Cron Loaded");
