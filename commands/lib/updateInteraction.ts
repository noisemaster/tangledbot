import {
  Bot,
  DiscordMessage,
  InteractionResponseTypes,
  Message,
  Camelize,
  InteractionCallbackData,
  Interaction,
  FileContent,
} from "discordeno";
import { SendRequestOptions } from "@discordeno/rest";

export async function updateInteractionWithFile(
  bot: Bot,
  token: string,
  options: InteractionCallbackData,
): Promise<Camelize<DiscordMessage>> {
  const result = await bot.rest.editOriginalInteractionResponse(token, options);

  return result;
}

export async function updateInteraction(
  interaction: Interaction,
  data: InteractionCallbackData,
  files?: FileContent[],
): Promise<Camelize<DiscordMessage>> {
  const result = await interaction.bot.rest
    .patch<DiscordMessage>(
      interaction.bot.rest.routes.interactions.responses.original(
        interaction.applicationId,
        interaction.token,
      ),
      {
        body: data,
        files,
      },
    )
    .catch((err) => {
      console.log(err);
    });

  return result!;
}
