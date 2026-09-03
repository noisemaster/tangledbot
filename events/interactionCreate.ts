import {
  ApplicationCommandOptionTypes,
  hasProperty,
  Interaction,
  InteractionTypes,
} from "discordeno";
import { logger } from "@discordeno/utils";

import { client } from "../bot.ts";
import { Command, commands, subCommand } from "../commands/mod.ts";
import { togglePost } from "../handlers/imagePostHandler.ts";
import { updatePage } from "../handlers/paginationHandler.ts";
import { updateTimerange } from "../handlers/timerangeHandler.ts";

function resolveCommand(interaction: Interaction): Command | undefined {
  const data = interaction.data;

  if (!data?.name) {
    return undefined;
  }

  const command = commands.get(data.name);
  const firstOption = data.options?.[0];

  if (!command || !firstOption) {
    return command;
  }

  if (firstOption.type === ApplicationCommandOptionTypes.SubCommandGroup) {
    const group = command.subcommands?.find(
      (candidate) => candidate.name === firstOption.name,
    );

    if (!group || !hasProperty(group, "subCommands")) {
      return undefined;
    }

    const targetName = firstOption.options?.[0]?.name;
    return targetName
      ? (group.subCommands as subCommand[]).find(
        (candidate) => candidate.name === targetName,
      )
      : undefined;
  }

  if (firstOption.type === ApplicationCommandOptionTypes.SubCommand) {
    const subcommand = command.subcommands?.find(
      (candidate) => candidate.name === firstOption.name,
    );

    return subcommand && !hasProperty(subcommand, "subCommands")
      ? subcommand
      : undefined;
  }

  return command;
}

async function dispatchInteraction(interaction: Interaction): Promise<void> {
  const bot = interaction.bot;

  if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
    const command = resolveCommand(interaction);

    if (command?.autocomplete) {
      await command.autocomplete(bot, interaction);
    } else {
      await interaction.respond({ choices: [] });
    }

    return;
  }

  if (interaction.type === InteractionTypes.MessageComponent) {
    const commandType = interaction.data?.customId?.split("_")[0];

    switch (commandType) {
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
        logger.warn(`Unknown component type: ${commandType ?? "missing"}`);
        break;
    }

    return;
  }

  if (interaction.type !== InteractionTypes.ApplicationCommand) {
    return;
  }

  const command = resolveCommand(interaction);

  if (!command) {
    logger.warn(`Unknown application command: ${interaction.data?.name}`);
    await interaction.respond("That command is not available right now.", {
      isPrivate: true,
    });
    return;
  }

  // Discordeno does not await interaction event callbacks. Awaiting here is
  // therefore essential so a rejected command promise reaches our boundary.
  await command.execute(bot, interaction);
}

async function reportInteractionError(
  interaction: Interaction,
  error: unknown,
): Promise<void> {
  logger.error(
    `Interaction ${String(interaction.id)} failed (${
      interaction.data?.name ?? interaction.data?.customId ?? "unknown"
    })`,
    error,
  );

  try {
    if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
      if (!interaction.acknowledged) {
        await interaction.respond({ choices: [] });
      }
      return;
    }

    const response = {
      content: "Something went wrong while handling that interaction.",
      components: [],
      embeds: [],
    };

    if (interaction.acknowledged) {
      await interaction.edit(response);
    } else {
      await interaction.respond(response, { isPrivate: true });
    }
  } catch (responseError) {
    logger.error(
      `Failed to report interaction ${String(interaction.id)} error to Discord`,
      responseError,
    );
  }
}

export async function handleInteractionCreate(
  interaction: Interaction,
): Promise<void> {
  try {
    await dispatchInteraction(interaction);
  } catch (error) {
    await reportInteractionError(interaction, error);
  }
}

client.events.interactionCreate = (interaction) => {
  // The library intentionally drops the returned event promise, so explicitly
  // own it here and keep every rejection inside handleInteractionCreate.
  void handleInteractionCreate(interaction as Interaction);
};
