import { Embed, GuildTextChannel, Interaction, InteractionResponseType } from 'https://deno.land/x/harmony@v2.0.0-rc1/mod.ts'
import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
import { addHideablePost } from "../handlers/imagePostHandler.ts";
import { trim } from "./lib/trim.ts";
import { sendInteraction } from "./lib/sendInteraction.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";

interface redditPost {
    data: {
        url: string;
        title: string;
        stickied: boolean;
        selftext: string;
        is_self: boolean;
        score: number;
        num_comments: number;
        domain: string;
        over_18: boolean;
        permalink: string;
        subreddit: string;
        created_utc: number;
    }
}

export const sendRedditEmbed = async (interaction: Interaction) => {
    if (!interaction.data) {
        return;
    }

    const subredditOption = interaction.data.options.find(option => option.name === 'subreddit');
    const isImageOption = interaction.data.options.find(option => option.name === 'image');

    const subreddit: string = subredditOption ? subredditOption.value : '';
    const isImage: boolean = isImageOption ? isImageOption.value : false;

    try {
        await interaction.respond({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
        });
    } catch (error) {
        console.error(error);
        return;
    }

    const request = await fetch(`https://www.reddit.com/r/${subreddit}.json?limit=100`);
    const redditData = await request.json();

    const posts = redditData.data.children.filter((x: redditPost) => 
        isImage
        ? x.data.url.includes('.jpg') ||
          x.data.url.includes('.png') ||
          x.data.url.includes('.jpeg') ||
          (x.data.url.includes('.gif') && !x.data.url.includes('.gifv'))
        : true
    );

    if (posts.length === 0) {
        await sendInteraction(interaction, 'No posts found');
        return;
    }

    const randomIndex = Math.floor(Math.random() * posts.length);
    const post = posts[randomIndex].data;

    const isPostImage = isImage || post.url.includes('.jpg') || post.url.includes('.png') || post.url.includes('.jpeg') || post.url.includes('.gif')
    const postDate = format(new Date(post.created_utc * 1000), "yyyy-MM-dd'T'HH:mm:ssxxx", undefined);

    const postEmbed = new Embed({
        title: post.title,
        url: post.url,
        author: {
            name: `/${post.subreddit_name_prefixed}`,
            url: `https://reddit.com/r/${subreddit}`
        },
        description: `[View Comments](https://www.reddit.com${post.permalink})\n${post.is_self ? trim(post.selftext, 850) : ''}`,
        color: 0xE5343A,
        fields: [
            { name: "Score", value: post.score, inline: true },
            { name: "Comments", value: post.num_comments, inline: true },
            { name: "From", value: post.domain, inline: true },
        ],
        footer: {
            text: `Post ${randomIndex + 1}/${posts.length}`,
        },
        timestamp: postDate
    });

    if (isPostImage) {
        postEmbed.setImage({
            url: post.url
        })
    }

    if (post.over_18 && interaction.channel && !(interaction.channel as GuildTextChannel).nsfw) {
        await sendInteraction(interaction, 'This channel is not a NSFW channel');
        return;
    }

    // temp workaround as harmony lacks message components
    const components: any[] = [];

    if (isPostImage) {
        const internalMessageId = v4.generate();

        components.push({
            type: 1,
            components: [{
                type: 2,
                style: 2,
                label: 'Hide Image',
                custom_id: `hideable_${internalMessageId}`,
            }]
        });

        addHideablePost(internalMessageId, {
            details: {
                imageUrl: post.url
            },
            embedMessage: postEmbed,
            poster: interaction.user.id,
            visible: true
        });
    }

    await sendInteraction(interaction, {
        embeds: [postEmbed],
        allowedMentions: {
            users: []
        },
        components
    } as any);
}
