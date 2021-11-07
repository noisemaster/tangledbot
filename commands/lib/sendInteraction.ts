import { Interaction, Message, TextChannel, User } from "https://deno.land/x/harmony@v2.1.3/mod.ts";
import { WebhookMessageOptions } from "https://deno.land/x/harmony@v2.1.3/src/structures/webhook.ts";

/**
 * Stripped down replacement for the currently broken interaction.send function
 * which didn't use the application id, using the bot's id instead. Which is broken on
 * some applications.
 * 
 * @param interaction
 * @param payload
 * @returns Promise<Message>
 */
export const sendInteraction = async (interaction: Interaction, payload: WebhookMessageOptions | string) => {
    const { client } = interaction;
    const appID = client.applicationID;

    if (!appID) {
        throw new Error('Missing Application ID');
    }
    
    const webhookReplyRequest = interaction.client.rest.api.webhooks[appID][interaction.token];

    let rawData: any = {};

    if (typeof payload === 'string') {
        const data = {
            content: payload,
        }
        rawData = await webhookReplyRequest.post(data);
    } else {
        rawData = await webhookReplyRequest.post(payload);
    }
    
    const res = new Message(
        client,
        rawData,
        (this as unknown) as TextChannel,
        (this as unknown) as User
    )
    await res.mentions.fromPayload(rawData)
    return res;
}

/**
 * Callback response for autocompletes
 */
 export const autoCompleteCallback = async (interaction: Interaction, choices: any[]) => {
    const callback = interaction.client.rest.api.interactions[interaction.id][interaction.token].callback;

    let rawData: any = {
        type: 8,
        data: {choices}
    };

    await callback.post(rawData);
}