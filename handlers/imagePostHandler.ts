import { Embed } from "https://deno.land/x/harmony@v1.1.5/src/structures/embed.ts";
import { MessageReaction } from "https://deno.land/x/harmony@v1.1.5/src/structures/messageReaction.ts";
import { User } from "https://deno.land/x/harmony@v1.1.5/src/structures/user.ts";

// Contains hideable content in details, original post information
export interface hideablePost {
    details: {
        imageUrl: string,
    },
    poster: string,
    embedMessage: Embed
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