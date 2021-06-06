import { ButtonStyle, Embed, InteractionResponseType, MessageComponentInteraction, MessageComponentType } from "https://deno.land/x/harmony@v2.0.0-rc2/mod.ts";

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
}

// In-Memory post detail store
const postPages: {[messageId: string]: paginationPost<Pageable>} = {};

export const setPageablePost = (messageId: string, pageablePost: paginationPost<Pageable>) => {
    postPages[messageId] = pageablePost;
}

export const updatePage = async (interaction: MessageComponentInteraction) => {
    const {custom_id: customId} = interaction.data;
    const [_componentId, _commandInvoker, _action, messageId] = customId.split('_');
    const reactingUser = interaction.user;
    const postData: paginationPost<Pageable> = postPages[messageId];
    await interaction.respond({
        type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE
    });

    if (!postData) {
        console.log(`${customId}: message not found`)
        return;
    }

    if (postData.poster === reactingUser.id) {
        await postData.paginationHandler(interaction, postData);
    }
}

export const generatePageButtons = (command: string, pageData: paginationPost<Pageable>, internalMessageId: string) => {
    return [{
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
                disabled: true,
                label: `Page ${pageData.currentPage}/${pageData.pages.length}`,
                customID: `pageable_${command}_info_${internalMessageId}`,
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
    }]
}