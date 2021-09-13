import { MessageComponentInteraction, InteractionResponseType, InteractionResponseFlags } from "https://deno.land/x/harmony@v2.1.3/mod.ts";
import { Embed } from "https://deno.land/x/harmony@v2.1.3/src/structures/embed.ts";
import { MessageReaction } from "https://deno.land/x/harmony@v2.1.3/src/structures/messageReaction.ts";
import { User } from "https://deno.land/x/harmony@v2.1.3/src/structures/user.ts";

// Contains hideable content in details, original post information
export interface hideablePost {
    details: {
        imageUrl: string,
    },
    poster: string,
    embedMessage: Embed,
    visible: boolean,
}

// In-Memory post detail store
const hideablePosts: {[messageId: string]: hideablePost} = {}

export const addHideablePost = (messageId: string, hideablePost: hideablePost) => {
    hideablePosts[messageId] = hideablePost;
}

export const isPostHideable = (messageId: string) => {
    return !!hideablePosts[messageId];
}

export const hidePost = async (reaction: MessageReaction, reactingUser: User) => {
    const postData = hideablePosts[reaction.message.id];
    console.log(postData);
    if (postData.poster === reactingUser.id) {
        const embed = postData.embedMessage;
        embed.image = undefined;
        console.log(embed);
        await reaction.message.edit('', {embed})
    }
}

export const showPost = async (reaction: MessageReaction, reactingUser: User) => {
    const postData = hideablePosts[reaction.message.id];
    if (postData.poster === reactingUser.id) {
        const embed = postData.embedMessage;
        embed.setImage({url: postData.details.imageUrl});
        console.log(embed);
        await reaction.message.edit('', {embed})
    }
}

export const togglePost = async (interaction: MessageComponentInteraction) => {
    const {custom_id: customId} = interaction.data;
    const messageId = customId.replace('hideable_', '');
    const reactingUser = interaction.user;

    const postData = hideablePosts[messageId];

    if (!postData) {
        return;
    }

    if (postData.poster === reactingUser.id) {
        const embed = postData.embedMessage;

        if (postData.visible) {
            embed.image = undefined;
        } else {
            embed.setImage({url: postData.details.imageUrl});
        }

        postData.visible = !postData.visible;
        console.log(embed);

        if (interaction.message) {
            await interaction.respond({
                type: InteractionResponseType.UPDATE_MESSAGE,
                embeds: [embed],
                allowedMentions: {
                    users: []
                },
                components: [{
                    type: 1,
                    components: [{
                        type: 2,
                        style: 2,
                        label: `${postData.visible ? 'Hide' : 'Show'} Image`,
                        customID: customId,
                    }]
                }]
            });
        }
    } else {
        await interaction.respond({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            flags: InteractionResponseFlags.EPHEMERAL,
            content: `Only the orignal poster can ${postData.visible ? 'hide' : 'show'} this message`
        });
    }
}