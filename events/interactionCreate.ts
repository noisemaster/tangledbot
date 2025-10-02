import {
  ApplicationCommandOptionTypes,
  hasProperty,
  InteractionTypes,
  Bot,
  Interaction,
  EventHandlers,
} from "discordeno";

import { Command, commands, subCommand } from "../commands/mod.ts";
import { handleTeamAutocomplete } from "../commands/nfl.ts";
import {
  handleGraphAutocomplete,
  handlePlayerAutocomplete,
} from "../commands/yahoo-fantasy.ts";
import { togglePost } from "../handlers/imagePostHandler.ts";
import { updatePage } from "../handlers/paginationHandler.ts";
import { updateTimerange } from "../handlers/timerangeHandler.ts";
import { client } from "../bot.ts";

client.events.interactionCreate = async (interaction) => {
  const bot = interaction.bot as any;
  // Cast interaction to have the full properties we need
  const fullInteraction = interaction as any as Interaction;

  if (fullInteraction.type === InteractionTypes.ApplicationCommandAutocomplete) {
    if (fullInteraction.data!.name === "nfl") {
      handleTeamAutocomplete(bot, fullInteraction);
    }

    if (
      fullInteraction.data!.name === "fantasy" &&
      fullInteraction.data!.options?.[0].name === "details"
    ) {
      handlePlayerAutocomplete(bot, fullInteraction);
    }

    if (
      fullInteraction.data!.name === "fantasy" &&
      fullInteraction.data!.options?.[0].name === "graph"
    ) {
      handleGraphAutocomplete(bot, fullInteraction);
    }

    return;
  }

  if (fullInteraction.type === InteractionTypes.MessageComponent) {
    const { customId } = fullInteraction.data!;
    const [command] = customId!.split("_");

    switch (command) {
      case "hideable":
        await togglePost(bot, fullInteraction);
        break;
      case "pageable":
        await updatePage(bot, fullInteraction);
        break;
      case "timerange":
        await updateTimerange(bot, fullInteraction);
        break;
      default:
        console.log(`Unknown command type ${command}`);
        break;
    }
  }

  if (
    fullInteraction.type === InteractionTypes.ApplicationCommand &&
    fullInteraction.data &&
    fullInteraction.id
  ) {
    let command: undefined | Command = fullInteraction.data.name
      ? commands.get(fullInteraction.data.name)
      : undefined;

    console.log(command);

    if (!command) {
      return;
    }

    if (!fullInteraction.data.name) {
      return;
    }

    if (fullInteraction.data.options?.[0]) {
      const optionType = fullInteraction.data.options[0].type;

      if (optionType === ApplicationCommandOptionTypes.SubCommandGroup) {
        // Check if command has subcommand and handle types
        if (!command.subcommands) {
          return;
        }

        // Try to find the subcommand group
        const subCommandGroup = command.subcommands?.find(
          (command) => command.name == fullInteraction.data?.options?.[0].name,
        );

        if (!subCommandGroup) {
          return;
        }

        if (!hasProperty(subCommandGroup, "subCommands")) {
          return;
        }

        // Get name of the command which we are looking for
        const targetCmdName =
          fullInteraction.data.options?.[0].options?.[0].name ||
          fullInteraction.data.options?.[0].options?.[0].name;

        if (!targetCmdName) {
          return;
        }

        // Try to find the command
        command = (subCommandGroup.subCommands as subCommand[]).find(
          (c) => c.name === targetCmdName,
        );
      }

      if (optionType === ApplicationCommandOptionTypes.SubCommand) {
        // Check if command has subcommand and handle types
        if (!command?.subcommands) {
          return;
        }

        // Try to find the command
        const found = command.subcommands.find(
          (command) => command.name == fullInteraction.data?.options?.[0].name,
        );
        if (!found) {
          return;
        }

        if (hasProperty(found, "subCommands")) {
          return;
        }

        command = found;
      }
    }

    try {
      if (command) {
        command.execute(bot, fullInteraction);
      } else {
        throw "";
      }
    } catch (err) {
      console.log(err);
    }
  }
};
