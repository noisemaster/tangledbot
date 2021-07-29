import { ButtonStyle, Embed, InteractionResponseFlags, InteractionResponseType, MessageComponentInteraction, MessageComponentOption, MessageComponentType } from "https://deno.land/x/harmony@v2.0.0-rc2/mod.ts";

export interface HasTimerange {
    pagable: true
}

export interface timerangePost<T extends HasTimerange> {
    poster: string;
    data: T,
    embedMessage: Embed;
    currentTime: string;
    timeRangeHandler(interaction: MessageComponentInteraction, postData: timerangePost<T>): Promise<void>;
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

export const updateTimerange = async (interaction: MessageComponentInteraction) => {
    const {custom_id: customId} = interaction.data;
    const [_componentId, _commandInvoker, _action, messageId] = customId.split('_');
    const reactingUser = interaction.user;
    const postData: timerangePost<HasTimerange> = timerangePosts[messageId];

    if (!postData) {
        console.log(`${customId}: message not found`)
        return;
    }

    // if (postData.poster === reactingUser.id) {
    await interaction.respond({
        type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE
    });
    await postData.timeRangeHandler(interaction, postData);
    // } else {
    //     await interaction.respond({
    //         type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    //         flags: InteractionResponseFlags.EPHEMERAL,
    //         content: 'Only the orignal poster can interact with this message'
    //     });
    // }
}

export const generateTimerangeButtons = (command: string, pageData: timerangePost<HasTimerange>, internalMessageId: string) => {
    const currentLabel = pageData.timeRanges.find(val => val.value === pageData.currentTime)!;
    
    return [
        {
            type: MessageComponentType.ActionRow,
            components: [
                {
                    type: MessageComponentType.Select,
                    placeholder: currentLabel.name,
                    customID: `timerange_${command}_select_${internalMessageId}`,
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