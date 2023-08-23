import { Bot, Camelize, DiscordEmbed, Embed, Interaction, InteractionResponseTypes, MessageComponents, MessageComponentTypes } from '@discordeno/bot';

export interface HasTimerange {
    pagable: true
}

export interface timerangePost<T extends HasTimerange> {
    poster: BigInt;
    data: T,
    embedMessage: Camelize<DiscordEmbed>;
    currentTime: string;
    timeRangeHandler(bot: Bot, interaction: Interaction, postData: timerangePost<T>): Promise<void>;
    timeRanges: {value: string, name: string}[];
    interactionData: any;
}

// In-Memory post detail store
const timerangePosts: {[messageId: string]: timerangePost<HasTimerange>} = {};

export const setTimerangePost = (messageId: string, timerangePost: timerangePost<HasTimerange>) => {
    timerangePosts[messageId] = timerangePost;
}

export function getTimerangePost<T extends HasTimerange>(messageId: string): timerangePost<T> {
    return timerangePosts[messageId] as timerangePost<T>;
}

export const updateTimerange = async (bot: Bot, interaction: Interaction) => {
    const {customId} = interaction.data!;
    const [_componentId, _commandInvoker, _action, messageId] = customId!.split('_');
    const reactingUser = interaction.user;
    const postData: timerangePost<HasTimerange> = timerangePosts[messageId];

    if (!postData) {
        console.log(`${customId}: message not found`)
        return;
    }

    // if (postData.poster === reactingUser.id) {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredUpdateMessage
    });
    await postData.timeRangeHandler(bot, interaction, postData);
    // } else {
    //     await interaction.respond({
    //         type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    //         flags: InteractionResponseFlags.EPHEMERAL,
    //         content: 'Only the orignal poster can interact with this message'
    //     });
    // }
}

export const generateTimerangeButtons = (command: string, pageData: timerangePost<HasTimerange>, internalMessageId: string): MessageComponents => {
    const currentLabel = pageData.timeRanges.find(val => val.value === pageData.currentTime)!;
    
    return [
        {
            type: MessageComponentTypes.ActionRow,
            components: [
                {
                    type: MessageComponentTypes.SelectMenu,
                    placeholder: currentLabel.name,
                    customId: `timerange_${command}_select_${internalMessageId}`,
                    options: pageData.timeRanges.map(x => ({
                        label: x.name,
                        value: x.value
                    })),
                    minValues: 1,
                    maxValues: 1,
                }
            ]
        }
    ]
}