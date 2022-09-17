import { Bot, DiscordMessage, InteractionResponseTypes, Message, InteractionCallbackData } from "discordeno/mod.ts";

export async function updateInteractionWithFile(
    bot: Bot,
    token: string,
    options: InteractionCallbackData,
): Promise<Message | undefined> {
    const result = await bot.rest.runMethod<DiscordMessage>(
        bot.rest,
        "PATCH",
        bot.constants.routes.INTERACTION_ORIGINAL_ID_TOKEN(bot.applicationId, token),
        {
            ...bot.transformers.reverse.interactionResponse(bot, {
                type: InteractionResponseTypes.UpdateMessage,
                data: options,
            }).data,
            file: options.file
        },
      );
    
    return bot.transformers.message(bot, result);
}