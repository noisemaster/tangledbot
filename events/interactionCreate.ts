import {
  ApplicationCommandOptionTypes,
  hasProperty,
  InteractionTypes,
} from "@discordeno/bot";

import { Bot, Interaction } from "discordeno";

import { Command, commands, subCommand } from "../commands/mod.ts";
import { handleTeamAutocomplete } from "../commands/nfl.ts";
import {
  handleGraphAutocomplete,
  handlePlayerAutocomplete,
} from "../commands/yahoo-fantasy.ts";
import { togglePost } from "../handlers/imagePostHandler.ts";
import { updatePage } from "../handlers/paginationHandler.ts";
import { updateTimerange } from "../handlers/timerangeHandler.ts";
import type { events } from "../bot.ts";

export const interactionCreate: InteractionCreate = async (
  bot,
  interaction,
) => {
  if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
    if (interaction.data!.name === "nfl") {
      handleTeamAutocomplete(bot, interaction);
    }

    if (
      interaction.data!.name === "fantasy" &&
      interaction.data!.options?.[0].name === "details"
    ) {
      handlePlayerAutocomplete(bot, interaction);
    }

    if (
      interaction.data!.name === "fantasy" &&
      interaction.data!.options?.[0].name === "graph"
    ) {
      handleGraphAutocomplete(bot, interaction);
    }

    return;
  }

  if (interaction.type === InteractionTypes.MessageComponent) {
    const { customId } = interaction.data!;
    const [command] = customId!.split("_");

    switch (command) {
      case "hideable":
        await togglePost(bot, interaction);
        break;
      case "pageable":
        await updatePage(bot, interaction);
        break;
      case "timerange":
        await updateTimerange(bot, interaction);
        break;
      default:
        console.log(`Unknown command type ${command}`);
        break;
    }
  }

  if (
    interaction.type === InteractionTypes.ApplicationCommand &&
    interaction.data &&
    interaction.id
  ) {
    let command: undefined | Command = interaction.data.name
      ? commands.get(interaction.data.name)
      : undefined;

    console.log(command);

    if (!command) {
      return;
    }

    if (!interaction.data.name) {
      return;
    }

    if (interaction.data.options?.[0]) {
      const optionType = interaction.data.options[0].type;

      if (optionType === ApplicationCommandOptionTypes.SubCommandGroup) {
        // Check if command has subcommand and handle types
        if (!command.subcommands) {
          return;
        }

        // Try to find the subcommand group
        const subCommandGroup = command.subcommands?.find(
          (command) => command.name == interaction.data?.options?.[0].name,
        );

        if (!subCommandGroup) {
          return;
        }

        if (!hasProperty(subCommandGroup, "subCommands")) {
          return;
        }

        // Get name of the command which we are looking for
        const targetCmdName =
          interaction.data.options?.[0].options?.[0].name ||
          interaction.data.options?.[0].options?.[0].name;

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
          (command) => command.name == interaction.data?.options?.[0].name,
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
        command.execute(bot, interaction);
      } else {
        throw "";
      }
    } catch (err) {
      console.log(err);
    }
  }
};
