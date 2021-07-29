import { MessageAttachment } from "https://deno.land/x/harmony@v2.0.0-rc2/mod.ts";
import { WebhookMessageOptions } from "https://deno.land/x/harmony@v2.0.0-rc2/src/structures/webhook.ts";

export interface webhookOptionsWithAttachments extends WebhookMessageOptions {
    attachments: MessageAttachment[]
}