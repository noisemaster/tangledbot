// import { Bot, DiscordApplicationCommand } from "@discordeno/bot";
// import { commands } from "../commands/mod.ts";
// import config from "../config.ts";
// import { events } from "./mod.ts";

// events.ready = async (payload) => {
//     console.log('Ready');

//     // console.log(commands.array());
//     // await bot.helpers.upsertGuildApplicationCommands();

//     await bot.helpers.upsertGuildApplicationCommands(
//         config.discord.testingGuildID,
//         commands.array()
//     );

//     await bot.helpers.upsertGlobalApplicationCommands(
//         commands.array()
//     );
// }