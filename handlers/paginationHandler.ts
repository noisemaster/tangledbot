import { ButtonStyle, Embed, InteractionResponseFlags, InteractionResponseType, MessageComponentInteraction, MessageComponentOption, MessageComponentType } from "https://deno.land/x/harmony@v2.6.0/mod.ts";

// custom id structure
// pagination_[command]_[action = prev|next]

export interface Pageable {
    pagable: true
}

export interface paginationPost<T extends Pageable> {
    poster: string;
    embedMessage: Embed;
    pages: T[];
    currentPage: number;
    paginationHandler(interaction: MessageComponentInteraction, postData: paginationPost<T>): Promise<void>;
    pageGenerator(pages: T[]): MessageComponentOption[];
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

export const updatePage = async (interaction: MessageComponentInteraction) => {
    const {custom_id: customId} = interaction.data;
    const [_componentId, _commandInvoker, _action, messageId] = customId.split('_');
    const reactingUser = interaction.user;
    const postData: paginationPost<Pageable> = postPages[messageId];

    if (!postData) {
        console.log(`${customId}: message not found`)
        return;
    }

    // if (postData.poster === reactingUser.id) {
    await interaction.respond({
        type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE
    });
    await postData.paginationHandler(interaction, postData);
    // } else {
    //     await interaction.respond({
    //         type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    //         flags: InteractionResponseFlags.EPHEMERAL,
    //         content: 'Only the orignal poster can interact with this message'
    //     });
    // }
}

export const generatePageButtons = (command: string, pageData: paginationPost<Pageable>, internalMessageId: string) => {
    return [
        {
            type: MessageComponentType.ActionRow,
            components: [
                {
                    type: MessageComponentType.Select,
                    placeholder: `Page ${pageData.currentPage}/${pageData.pages.length >= 25 ? 25 : pageData.pages.length}`,
                    customID: `pageable_${command}_select_${internalMessageId}`,
                    options: pageData.pageGenerator(pageData.pages),
                    minValues: 1,
                    maxValues: 1,
                }
            ]
        },
        {
            type: MessageComponentType.ActionRow,
            components: [
                {
                    type: MessageComponentType.Button,
                    style: ButtonStyle.SECONDARY,
                    emoji: {
                        name: "⬅"
                    },
                    customID: `pageable_${command}_prev_${internalMessageId}`,
                },
                {
                    type: MessageComponentType.Button,
                    style: ButtonStyle.SECONDARY,
                    emoji: {
                        name: "➡"
                    },
                    customID: `pageable_${command}_next_${internalMessageId}`,
                }
            ]
        }
    ]
}