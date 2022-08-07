import { MessageAttachment } from "https://deno.land/x/harmony@v2.6.0/mod.ts";
import { WebhookMessageOptions } from "https://deno.land/x/harmony@v2.6.0/src/structures/webhook.ts";

export interface webhookOptionsWithAttachments extends WebhookMessageOptions {
    attachments: MessageAttachment[]
}