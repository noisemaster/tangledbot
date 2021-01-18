import { Embed, GuildTextChannel, Interaction, InteractionResponseType } from 'https://deno.land/x/harmony@v0.9.3/mod.ts'
import { addHideablePost } from "../handlers/imagePostHandler.ts";

export const sendE621Embed = async (interaction: Interaction) => {
    const tagOption = interaction.data.options.find(option => option.name === 'tag');
    const tags: string = tagOption ? tagOption.value : '';
    let queryTags = tags.replace(/\s/g, '+');

    if (!interaction.channel.nsfw) {
        queryTags += '+rating:safe';
    }

    const request = await fetch(`https://e621.net/posts.json?tags=${queryTags}`);
    const postData = await request.json();

    const posts = postData.posts;

    if (posts.length === 0) {
        await interaction.respond({
            content: `Nothing found for ${tags}`
        })
    }

    const randomIndex = Math.floor(Math.random() * posts.length);
    const post = posts[randomIndex];
    const embed = new Embed();

    if (post.rating === "s") {
		embed.setColor(0x009e51);
	} else if (post.rating === "q") {
		embed.setColor(0xf9db43);
	} else {
		embed.setColor(0xf40804);
	}

    embed.setAuthor({
        name: interaction.user.username,
        icon_url: interaction.user.avatarURL('png', 256)
    });

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

    embed.addField('Tags', postTags.replace(/_/g, '\\_'), false);
    embed.addField('ID', post.id, true);
    embed.addField('Score', post.score.total, true);

    embed.addField(
        post.tags.artist.length === 1 ? 'Artist' : 'Artists',
        post.tags.artist.length === 1 ? post.tags.artist[0] : post.tags.artist.join(', '),
        true
    );

    embed.setDescription(`[Post Link](https://e621.net/posts/${post.id})`);
    embed.setImage({ url: post.file.url });
    embed.setFooter({ text: `Image ${randomIndex + 1}/${posts.length}` });

    try {
        await interaction.respond({
            type: InteractionResponseType.ACK_WITH_SOURCE,
        });
    } catch (error) {
        console.error(error);
        return;
    }

    const messageResponse = await interaction.send({
        embed: embed,
        allowedMentions: {
            users: []
        }
    });

    const channel = await messageResponse.client.channels.get(messageResponse.channelID);
    await (channel as GuildTextChannel).addReaction(messageResponse.id, '🙅');

    addHideablePost(messageResponse.id, {
        details: {
            imageUrl: post.file.url
        },
        embedMessage: embed,
        poster: interaction.user.id
    })
}