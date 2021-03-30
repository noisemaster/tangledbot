import { Interaction, Message, TextChannel, User } from "https://deno.land/x/harmony@v1.1.5/mod.ts";
import { WebhookMessageOptions } from "https://deno.land/x/harmony@v1.1.5/src/structures/webhook.ts";

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