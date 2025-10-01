import {
  Bot,
  editOriginalInteractionResponse,
  Interaction,
  InteractionCallbackData,
  Message,
  FileContent,
} from "discordeno";
import { SendRequestOptions } from "@discordeno/rest";

export async function updateInteractionWithFile(
  bot: Bot,
  token: string,
  options: InteractionCallbackData,
): Promise<Message | undefined> {
  const result = await editOriginalInteractionResponse(bot, token, options);

  return result;
}

export async function updateInteraction(
  bot: Bot,
  interaction: Interaction,
  data: InteractionCallbackData,
  files?: FileContent[],
): Promise<Message | undefined> {
  return editOriginalInteractionResponse(bot, interaction.token, {
    ...data,
    file: files,
  });
}
