import { MessageAttachment } from "https://deno.land/x/harmony@v2.1.3/mod.ts";
import { WebhookMessageOptions } from "https://deno.land/x/harmony@v2.1.3/src/structures/webhook.ts";

export interface webhookOptionsWithAttachments extends WebhookMessageOptions {
    attachments: MessageAttachment[]
}