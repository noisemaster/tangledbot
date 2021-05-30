import { InteractionResponseType, SlashCommandInteraction } from 'https://deno.land/x/harmony@v2.0.0-rc2/mod.ts'
import { Image } from 'https://deno.land/x/imagescript@1.1.16/mod.ts';
import { Buffer } from "https://deno.land/std@0.80.0/node/buffer.ts";
import { sendInteraction } from "../lib/sendInteraction.ts";

export const generateIsThisImage = async (interaction: SlashCommandInteraction) => {
    const [baseImage, font] = await Promise.all([
        Deno.readFile('./storage/IsThis.png'),
        Deno.readFile('./storage/Lato-Regular.ttf'),
    ]);

    const stroke = 5;
    const textPosX = 355;
    const textPosY = 675;
    const fontSize = 40;

    if (!interaction.data) {
        return;
    }

    const [{value: textContent}] = interaction.data.options;
    const background = await Image.decode(baseImage);
    const overlaidText = Image.renderText(font, fontSize, textContent, 0xffffffff);

    for (let dy = -stroke; dy <= stroke; dy++) {
		for (let dx = -stroke; dx <= stroke; dx++) {
			if (dx*dx+dy*dy >= stroke*stroke) {
				continue
			}
			const x = textPosX + dx;
			const y = textPosY + dy;
			const textBorder = Image.renderText(font, fontSize, textContent, 0x000000ff);
            background.composite(textBorder, x, y);
		}
	}
    
    background.composite(overlaidText, textPosX, textPosY);

    await interaction.respond({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE
    });

    const encodedImage = await background.encode();

    await interaction.send({
        file: {
            name: 'isthis.jpg',
            blob: new Blob([Buffer.from(encodedImage)])
        }
    });
}