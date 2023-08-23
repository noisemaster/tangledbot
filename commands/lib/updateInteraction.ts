import { Bot, DiscordMessage, InteractionResponseTypes, Message, InteractionCallbackData, BotInteractionCallbackData, CamelizedDiscordMessage, Interaction, FileContent } from "@discordeno/bot";
import {} from '@discordeno/utils';
import { SendRequestOptions } from '@discordeno/rest';

export async function updateInteractionWithFile(
    bot: Bot,
    token: string,
    options: InteractionCallbackData,
): Promise<CamelizedDiscordMessage> {
    const result = await bot.rest.editOriginalInteractionResponse(
        token,
        options
      );
    
    return result;
}

export async function updateInteraction(
    interaction: Interaction,
    data: InteractionCallbackData,
    files?: FileContent[]
): Promise<CamelizedDiscordMessage> {
    const result = await interaction.bot.rest.patch<DiscordMessage>(
        interaction.bot.rest.routes.interactions.responses.original(interaction.applicationId, interaction.token), {
            body: data,
            files
        }
    ).catch((err) => {
        console.log(err);
    });
    
    return result!;
}