import { Bot, Interaction, ButtonStyles, MessageComponents, MessageComponentTypes, SelectOption, Embed, InteractionResponseTypes } from "https://deno.land/x/discordeno@14.0.0/mod.ts";

// custom id structure
// pagination_[command]_[action = prev|next]

export interface Pageable {
    pagable: true
}

export interface paginationPost<T extends Pageable> {
    poster: BigInt;
    embedMessage: Embed;
    pages: T[];
    currentPage: number;
    paginationHandler(bot: Bot, interaction: Interaction, postData: paginationPost<T>): Promise<void>;
    pageGenerator(pages: T[]): SelectOption[];
    interactionData: any;
}

// In-Memory post detail store
const postPages: {[messageId: string]: paginationPost<Pageable>} = {};

export const setPageablePost = (messageId: string, pageablePost: paginationPost<Pageable>) => {
    postPages[messageId] = pageablePost;
}

export function getPageablePost<T extends Pageable>(messageId: string): paginationPost<T> {
    return postPages[messageId] as paginationPost<T>;
}

export const updatePage = async (bot: Bot, interaction: Interaction) => {
    const {customId} = interaction.data!;
    const [_componentId, _commandInvoker, _action, messageId] = customId!.split('_');
    const reactingUser = interaction.user;
    const postData: paginationPost<Pageable> = postPages[messageId];

    if (!postData) {
        console.log(`${customId}: message not found`)
        return;
    }

    // if (postData.poster === reactingUser.id) {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredUpdateMessage
    });
    await postData.paginationHandler(bot, interaction, postData);
    // } else {
    //     await interaction.respond({
    //         type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    //         flags: InteractionResponseFlags.EPHEMERAL,
    //         content: 'Only the orignal poster can interact with this message'
    //     });
    // }
}

export const generatePageButtons = (command: string, pageData: paginationPost<Pageable>, internalMessageId: string): MessageComponents => {
    return [
        {
            type: MessageComponentTypes.ActionRow,
            components: [
                {
                    type: MessageComponentTypes.SelectMenu,
                    placeholder: `Page ${pageData.currentPage}/${pageData.pages.length >= 25 ? 25 : pageData.pages.length}`,
                    customId: `pageable_${command}_select_${internalMessageId}`,
                    options: pageData.pageGenerator(pageData.pages),
                    minValues: 1,
                    maxValues: 1,
                }
            ]
        },
        {
            type: MessageComponentTypes.ActionRow,
            components: [
                {
                    type: MessageComponentTypes.Button,
                    style: ButtonStyles.Secondary,
                    emoji: {
                        name: "⬅"
                    },
                    customId: `pageable_${command}_prev_${internalMessageId}`,
                    label: 'Prev'
                },
                {
                    type: MessageComponentTypes.Button,
                    style: ButtonStyles.Secondary,
                    emoji: {
                        name: "➡"
                    },
                    customId: `pageable_${command}_next_${internalMessageId}`,
                    label: 'Next'
                }
            ]
        }
    ]
}