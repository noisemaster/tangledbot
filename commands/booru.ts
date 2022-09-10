import { Bot, ButtonStyles, Embed, Interaction, InteractionResponseTypes, MessageComponentTypes } from 'discordeno/mod.ts';
import { addHideablePost } from "../handlers/imagePostHandler.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";

export const sendE621Embed = async (bot: Bot, interaction: Interaction) => {
    if (!interaction.data) {
        return;
    }

    const tagOption = interaction.data!.options!.find(option => option.name === 'tag');
    const tags: string = tagOption ? tagOption.value as string : '';
    let queryTags = tags.replace(/\s/g, '+');

    const channel = await bot.helpers.getChannel(interaction.channelId!);

    if (!channel.nsfw) {
        queryTags += '+rating:safe';
    }

    try {
        await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
            type: InteractionResponseTypes.DeferredChannelMessageWithSource,
        });
    } catch (error) {
        console.error(error);
        return;
    }

    const request = await fetch(`https://e621.net/posts.json?tags=${queryTags}`);
    const postData = await request.json();

    const posts = postData.posts;

    if (posts.length === 0) {
        // await interaction.send(`Nothing found for ${tags}`);
        await bot.helpers.editOriginalInteractionResponse(interaction.token, {
            content: `Nothing found for ${tags}`
        });
        return;
    }

    const randomIndex = Math.floor(Math.random() * posts.length);
    const post = posts[randomIndex];
    const embed: Embed = {
        author: {
            name: interaction.user.username,
            iconUrl: bot.helpers.getAvatarURL(interaction.user.id, interaction.user.discriminator, {
                size: 256,
                avatar: interaction.user.avatar,
                format: 'png'
            })
        },
        fields: [],
    };

    if (post.rating === "s") {
		embed.color = 0x009e51;
	} else if (post.rating === "q") {
		embed.color = 0xf9db43;
	} else {
		embed.color = 0xf40804;
	}

    let postTags = post.tags.character.join(' ') + '\n' +
        post.tags.copyright.join(' ') + '\n' +
        post.tags.general.join(' ') + '\n' +
        post.tags.lore.join(' ') + '\n' +
        post.tags.meta.join(' ') + '\n' +
        post.tags.species.join(' ') + '\n' +
        post.tags.invalid.join(' ');

    const tagCount = post.tags.character.length +
        post.tags.copyright.length +
        post.tags.general.length +
        post.tags.lore.length +
        post.tags.meta.length +
        post.tags.species.length +
        post.tags.invalid.length;

    if (postTags.length > 900) {
        postTags = `${tagCount} Tags`;
    }

    embed.fields!.push({name: 'Tags', value: postTags.replace(/_/g, '\\_'), inline: false});
    embed.fields!.push({name: 'ID', value: post.id, inline: true});
    embed.fields!.push({name: 'Score', value: post.score.total, inline: true});

    if (post.tags.artist.length > 0) {
        embed.fields!.push({
            name: post.tags.artist.length === 1 ? 'Artist' : 'Artists',
            value: post.tags.artist.length === 1 ? post.tags.artist[0] : post.tags.artist.join(', '),
            inline: true
        });
    } else {
        embed.fields!.push({
            name: 'Artist',
            value: 'Unknown',
            inline: true
        });
    }

    embed.description = `[Post Link](https://e621.net/posts/${post.id})`;
    embed.image = { url: post.file.url };
    embed.footer = { text: `Image ${randomIndex + 1}/${posts.length}` };
    embed.timestamp = post.created_at;

    // const messageResponse = await interaction.send({
    //     embed: embed,
    //     allowedMentions: {
    //         users: []
    //     }
    // });

    const internalMessageId = v4.generate();

    addHideablePost(internalMessageId, {
        details: {
            imageUrl: post.file.url
        },
        embedMessage: embed,
        poster: interaction.user.id,
        visible: true
    });

    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        embeds: [embed],
        allowedMentions: {
            users: []
        },
        components: [{
            type: MessageComponentTypes.ActionRow,
            components: [{
                type: MessageComponentTypes.Button,
                style: ButtonStyles.Secondary,
                label: 'Hide Image',
                customId: `hideable_${internalMessageId}`,
            }]
        }]
    });
}