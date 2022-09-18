import { ApplicationCommandOption, ApplicationCommandOptionTypes, ApplicationCommandTypes, Bot, Collection, Interaction } from "discordeno/mod.ts";

export type subCommand = Omit<Command, "subcommands">;
export type subCommandGroup = {
  name: string;
  subCommands: subCommand[];
};
export interface Command {
  name: string;
  description: string;
  usage?: string[];
  options?: ApplicationCommandOption[];
  type: ApplicationCommandTypes;
  /** Defaults to `Guild` */
  scope?: "Global" | "Guild";
  execute: (bot: Bot, interaction: Interaction) => unknown;
  subcommands?: Array<subCommandGroup | subCommand>;
}

export const commands = new Collection<string, Command>();

export function createCommand(command: Command) {
  if (command.subcommands) {
    command.options = command.subcommands.map((x) => {
      const handler = x as subCommand;
      
      return {
        name: handler.name,
        description: handler.description,
        type: ApplicationCommandOptionTypes.SubCommand,
      }
    })
  }

  commands.set(command.name, command);
}