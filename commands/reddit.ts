// import { ButtonStyle, Embed, GuildTextChannel, Interaction, InteractionResponseType, MessageComponentType, SlashCommandInteraction } from 'https://deno.land/x/harmony@v2.6.0/mod.ts'
// import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
import { addHideablePost } from "../handlers/imagePostHandler.ts";
import { trim } from "./lib/trim.ts";
import { v4 } from "uuid";
import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  ButtonStyles,
  Camelize,
  DiscordEmbed,
  Embed,
  InteractionResponseTypes,
  MessageComponentTypes,
  Bot,
  Interaction,
} from "discordeno";

import { createCommand } from "./mod.ts";
import { updateInteraction } from "./lib/updateInteraction.ts";

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
  };
}

export const sendRedditEmbed = async (bot: Bot, interaction: Interaction) => {
  if (!interaction.data) {
    return;
  }

  const subredditOption = interaction.data!.options!.find(
    (option) => option.name === "subreddit",
  );
  const isImageOption = interaction.data!.options!.find(
    (option) => option.name === "image",
  );

  const subreddit: string = subredditOption
    ? (subredditOption.value as string)
    : "";
  const isImage: boolean = isImageOption
    ? (isImageOption.value as boolean)
    : false;

  try {
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource,
      },
    );
  } catch (error) {
    console.error(error);
    return;
  }

  const request = await fetch(
    `https://www.reddit.com/r/${subreddit}.json?limit=100`,
  );
  const redditData: any = await request.json();

  const posts = redditData.data.children.filter((x: redditPost) =>
    isImage
      ? x.data.url.includes(".jpg") ||
        x.data.url.includes(".png") ||
        x.data.url.includes(".jpeg") ||
        (x.data.url.includes(".gif") && !x.data.url.includes(".gifv"))
      : true,
  );

  if (posts.length === 0) {
    await updateInteraction(bot, interaction, {
      content: "No posts found",
    });
    return;
  }

  const randomIndex = Math.floor(Math.random() * posts.length);
  const post = posts[randomIndex].data;

  const isPostImage =
    isImage ||
    post.url.includes(".jpg") ||
    post.url.includes(".png") ||
    post.url.includes(".jpeg") ||
    post.url.includes(".gif");

  const postEmbed: Embed = {
    title: post.title,
    url: post.url,
    author: {
      name: `/${post.subreddit_name_prefixed}`,
      url: `https://reddit.com/r/${subreddit}`,
    },
    description: `[View Comments](https://www.reddit.com${post.permalink})\n${post.is_self ? trim(post.selftext, 850) : ""}`,
    color: 0xe5343a,
    fields: [
      { name: "Score", value: post.score, inline: true },
      { name: "Comments", value: post.num_comments, inline: true },
      { name: "From", value: post.domain, inline: true },
    ],
    footer: {
      text: `Post ${randomIndex + 1}/${posts.length}`,
    },
    timestamp: new Date(post.created_utc * 1000).valueOf(),
  };

  if (isPostImage) {
    postEmbed.image = {
      url: post.url,
    };
  }

  const channel = await bot.helpers.getChannel(interaction.channelId!);

  if (post.over_18 && !channel.nsfw) {
    await updateInteraction(bot, interaction, {
      content: "This channel is not a NSFW channel",
    });
    return;
  }

  // temp workaround as harmony lacks message components
  const components: any[] = [];

  if (isPostImage) {
    const internalMessageId = v4();

    components.push({
      type: MessageComponentTypes.ActionRow,
      components: [
        {
          type: MessageComponentTypes.Button,
          style: ButtonStyles.Secondary,
          label: "Hide Image",
          customId: `hideable_${internalMessageId}`,
        },
      ],
    });

    addHideablePost(internalMessageId, {
      details: {
        imageUrl: post.url,
      },
      embedMessage: postEmbed,
      poster: interaction.user.id,
      visible: true,
    });
  }

  await updateInteraction(bot, interaction, {
    embeds: [postEmbed],
    allowedMentions: {
      users: [],
    },
    components,
  });
};

createCommand({
  name: "reddit",
  description: "Fetch a random post from Reddit",
  type: ApplicationCommandTypes.ChatInput,
  options: [
    {
      name: "subreddit",
      description: "Subreddit to get posts from",
      type: ApplicationCommandOptionTypes.String,
      required: true,
    },
    {
      name: "image",
      description: "Fetch a random image from the subreddit",
      required: false,
      type: ApplicationCommandOptionTypes.Boolean,
    },
  ],
  execute: sendRedditEmbed,
});
