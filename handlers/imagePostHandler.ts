import {
  Bot,
  Camelize,
  DiscordEmbed,
  Interaction,
} from "discordeno";
import { updateInteraction } from "../commands/lib/updateInteraction.ts";
import { ExpiringStore } from "../helpers/expiringStore.ts";

// Contains hideable content in details, original post information
export interface hideablePost {
  details: {
    imageUrl: string;
  };
  poster: bigint;
  embedMessage: Camelize<DiscordEmbed>;
  visible: boolean;
}

const hideablePosts = new ExpiringStore<hideablePost>({
  maxEntries: 2_000,
  ttlMs: 6 * 60 * 60 * 1_000,
});

export const addHideablePost = (
  messageId: string,
  hideablePost: hideablePost,
) => {
  hideablePosts.set(messageId, hideablePost);
};

export const isPostHideable = (messageId: string) => {
  return !!hideablePosts.get(messageId);
};

export const togglePost = async (_bot: Bot, interaction: Interaction) => {
  const { customId } = interaction.data!;
  const messageId = customId!.replace("hideable_", "");
  const reactingUser = interaction.user;

  const postData = hideablePosts.get(messageId);

  if (!postData) {
    await interaction.respond(
      "This image control has expired. Run the command again.",
      { isPrivate: true },
    );
    return;
  }

  if (postData.poster === reactingUser.id) {
    const embed = postData.embedMessage;

    if (postData.visible) {
      embed.image = undefined;
    } else {
      embed.image = { url: postData.details.imageUrl };
    }

    postData.visible = !postData.visible;
    console.log(embed);

    if (interaction.message) {
      await interaction.edit({
        embeds: [embed],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: `${postData.visible ? "Hide" : "Show"} Image`,
                customId,
              },
            ],
          },
        ],
      });
    }
  } else {
    await interaction.defer(true);
    await updateInteraction(interaction, {
      content: `Only the orignal poster can ${
        postData.visible ? "hide" : "show"
      } this message`,
      // flags:
    });
  }
};
