import {
  Bot,
  Camelize,
  DiscordEmbed,
  Interaction,
  MessageComponents,
  MessageComponentTypes,
} from "discordeno";
import { ExpiringStore } from "../helpers/expiringStore.ts";

export interface HasTimerange {
  pagable: true;
}

export interface timerangePost<T extends HasTimerange> {
  poster: bigint;
  data: T;
  embedMessage: Camelize<DiscordEmbed>;
  currentTime: string;
  timeRangeHandler(
    bot: Bot,
    interaction: Interaction,
    postData: timerangePost<T>,
  ): Promise<void>;
  timeRanges: { value: string; name: string }[];
  interactionData: any;
}

const timerangePosts = new ExpiringStore<timerangePost<HasTimerange>>({
  maxEntries: 2_000,
  ttlMs: 6 * 60 * 60 * 1_000,
});

export const setTimerangePost = (
  messageId: string,
  timerangePost: timerangePost<HasTimerange>,
) => {
  timerangePosts.set(messageId, timerangePost);
};

export function getTimerangePost<T extends HasTimerange>(
  messageId: string,
): timerangePost<T> | undefined {
  return timerangePosts.get(messageId) as timerangePost<T> | undefined;
}

export const updateTimerange = async (bot: Bot, interaction: Interaction) => {
  const { customId } = interaction.data!;
  const [_componentId, _commandInvoker, _action, messageId] = customId!.split(
    "_",
  );
  const postData = timerangePosts.get(messageId);

  if (!postData) {
    console.log(`${customId}: message not found`);
    await interaction.respond(
      "This time-range control has expired. Run the command again.",
      { isPrivate: true },
    );
    return;
  }

  // if (postData.poster === reactingUser.id) {
  await interaction.deferEdit();
  await postData.timeRangeHandler(bot, interaction, postData);
  // } else {
  //     await interaction.respond({
  //         type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  //         flags: InteractionResponseFlags.EPHEMERAL,
  //         content: 'Only the orignal poster can interact with this message'
  //     });
  // }
};

export const generateTimerangeButtons = (
  command: string,
  pageData: timerangePost<HasTimerange>,
  internalMessageId: string,
): MessageComponents => {
  const currentLabel = pageData.timeRanges.find(
    (val) => val.value === pageData.currentTime,
  )!;

  return [
    {
      type: MessageComponentTypes.ActionRow,
      components: [
        {
          type: MessageComponentTypes.StringSelect,
          placeholder: currentLabel.name,
          customId: `timerange_${command}_select_${internalMessageId}`,
          options: pageData.timeRanges.map((x) => ({
            label: x.name,
            value: x.value,
          })),
          minValues: 1,
          maxValues: 1,
        },
      ],
    },
  ];
};
