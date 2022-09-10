import { Bot, Embed, Interaction, InteractionResponseTypes } from 'discordeno/mod.ts';

// Contains hideable content in details, original post information
export interface hideablePost {
    details: {
        imageUrl: string,
    },
    poster: BigInt,
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

export const togglePost = async (bot: Bot, interaction: Interaction) => {
    const { customId } = interaction.data!;
    const messageId = customId!.replace('hideable_', '');
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
            embed.image = {url: postData.details.imageUrl};
        }

        postData.visible = !postData.visible;
        console.log(embed);

        if (interaction.message) {
            await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                type: InteractionResponseTypes.UpdateMessage,
                data: {
                    embeds: [embed],
                    components: [{
                        type: 1,
                        components: [{
                            type: 2,
                            style: 2,
                            label: `${postData.visible ? 'Hide' : 'Show'} Image`,
                            customId,
                        }]
                    }]
                }
            });
        }
    } else {
        await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
            type: InteractionResponseTypes.DeferredChannelMessageWithSource,
        });
        await bot.helpers.editOriginalInteractionResponse(interaction.token, {
            content: `Only the orignal poster can ${postData.visible ? 'hide' : 'show'} this message`,
            // flags: 
        })
    }
}