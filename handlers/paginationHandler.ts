import {
  Bot,
  ButtonStyles,
  Camelize,
  DiscordEmbed,
  Interaction,
  MessageComponents,
  MessageComponentTypes,
  SelectOption,
} from "discordeno";
import { ExpiringStore } from "../helpers/expiringStore.ts";

// custom id structure
// pagination_[command]_[action = prev|next]

export interface Pageable {
  pagable: true;
}

export interface paginationPost<T extends Pageable> {
  poster: bigint;
  embedMessage: Camelize<DiscordEmbed>;
  pages: T[];
  currentPage: number;
  paginationHandler(
    bot: Bot,
    interaction: Interaction,
    postData: paginationPost<T>,
  ): Promise<void>;
  pageGenerator(pages: T[]): SelectOption[];
  interactionData: any;
}

const postPages = new ExpiringStore<paginationPost<Pageable>>({
  maxEntries: 2_000,
  ttlMs: 6 * 60 * 60 * 1_000,
});

export const setPageablePost = (
  messageId: string,
  pageablePost: paginationPost<Pageable>,
) => {
  postPages.set(messageId, pageablePost);
};

export function getPageablePost<T extends Pageable>(
  messageId: string,
): paginationPost<T> | undefined {
  return postPages.get(messageId) as paginationPost<T> | undefined;
}

export const updatePage = async (bot: Bot, interaction: Interaction) => {
  const { customId } = interaction.data!;
  const [_componentId, _commandInvoker, _action, messageId] = customId!.split(
    "_",
  );
  const postData = postPages.get(messageId);

  if (!postData) {
    console.log(`${customId}: message not found`);
    await interaction.respond(
      "This pagination control has expired. Run the command again.",
      { isPrivate: true },
    );
    return;
  }

  // if (postData.poster === reactingUser.id) {
  await interaction.deferEdit();
  await postData.paginationHandler(bot, interaction, postData);
  // } else {
  //     await interaction.respond({
  //         type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  //         flags: InteractionResponseFlags.EPHEMERAL,
  //         content: 'Only the orignal poster can interact with this message'
  //     });
  // }
};

export const generatePageButtons = (
  command: string,
  pageData: paginationPost<Pageable>,
  internalMessageId: string,
): MessageComponents => {
  return [
    {
      type: MessageComponentTypes.ActionRow,
      components: [
        {
          type: MessageComponentTypes.StringSelect,
          placeholder: `Page ${pageData.currentPage}/${
            pageData.pages.length >= 25 ? 25 : pageData.pages.length
          }`,
          customId: `pageable_${command}_select_${internalMessageId}`,
          options: pageData.pageGenerator(pageData.pages),
          minValues: 1,
          maxValues: 1,
        },
      ],
    },
    {
      type: MessageComponentTypes.ActionRow,
      components: [
        {
          type: MessageComponentTypes.Button,
          style: ButtonStyles.Secondary,
          emoji: {
            name: "⬅",
          },
          customId: `pageable_${command}_prev_${internalMessageId}`,
          label: "Prev",
        },
        {
          type: MessageComponentTypes.Button,
          style: ButtonStyles.Secondary,
          emoji: {
            name: "➡",
          },
          customId: `pageable_${command}_next_${internalMessageId}`,
          label: "Next",
        },
      ],
    },
  ];
};
