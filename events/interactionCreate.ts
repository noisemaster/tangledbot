import { ApplicationCommandOptionTypes, Bot, hasProperty, Interaction } from 'discordeno/mod.ts';
import { Command, commands } from "../commands/mod.ts";
import { events } from './mod.ts';

events.interactionCreate = (bot: Bot, interaction: Interaction) => {
    if (interaction.data && interaction.id) {
        let command: undefined | Command = interaction.data.name ? commands.get(interaction.data.name) : undefined;
        
        if (!command) {
            return;
        }

        if (!interaction.data.name) {
            return;
        }

        if (!interaction.data.options?.[0]) {
            return;
        }

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
          console.log(subCommandGroup)

          if (!subCommandGroup) {
            return;
          }

          if (!hasProperty(subCommandGroup, "subCommands")) {
            return;
          }

          // Get name of the command which we are looking for
          const targetCmdName = interaction.data.options?.[0].options?.[0].name ||
            interaction.data.options?.[0].options?.[0].name;

          if (!targetCmdName) {
            return;
          }

          // Try to find the command
          command = subCommandGroup.subCommands.find((c) => c.name === targetCmdName);
        }

        if (optionType === ApplicationCommandOptionTypes.SubCommand) {
          // Check if command has subcommand and handle types
          if (!command?.subcommands) {
            return;
          }

          // Try to find the command
          const found = command.subcommands.find((command) => command.name == interaction.data?.options?.[0].name);
          if (!found) {
            return;
          }

          if (hasProperty(found, "subCommands")) {
            return;
          }

          command = found;
        }

        try {
            if (command) {
              console.log(command);
              command.execute(bot, interaction);
            } else {
              throw "";
            }
          } catch (err) {
            console.log(err);
          }
    }

}