import { Interaction, InteractionResponseType } from 'https://deno.land/x/harmony@v1.0.0/mod.ts'
import { encode, addPaddingToBase64url } from "https://deno.land/std@0.85.0/encoding/base64url.ts";
import { Buffer } from "https://deno.land/std@0.85.0/node/buffer.ts";
import wrap from 'https://deno.land/x/word_wrap/mod.ts';

const showURLMap: {[show: string]: string} = {
    'simpsons': 'https://frinkiac.com',
    'futurama': 'https://morbotron.com',
}

interface Frames {
	Id: number;
	Episode: string;
	Timestamp: number;
}

interface CaptionRequest {
	Frame: Frames
	Subtitles: {
		ID: number;
		RepresentativeTimestamp: number;
		Episode: string;
		StartTimestamp: number;
		EndTimestamp: number;
		Content: string;
	}[]
	Nearby: Frames[]
}

type requestType = 'frame' | 'gif' | 'subtitle';

export const sendShowEmbed = async (interaction: Interaction) => {
    const showOption: string = interaction.data.options.find(option => option.name === 'show')!.value;
    const phrase: string = interaction.data.options.find(option => option.name === 'phrase')!.value;
    const typeOption = interaction.data.options.find(option => option.name === 'type');
    const textOverride = interaction.data.options.find(option => option.name === 'subtitleoverride');

    const type: requestType = typeOption ? typeOption.value : 'subtitle';
    const subtitleOverride: string = textOverride ? textOverride.value : '';

    await interaction.respond({
        type: InteractionResponseType.ACK_WITH_SOURCE
    });

    const urlBase: string = showURLMap[showOption];
    const framesRequest = await fetch(`${urlBase}/api/search?q=${encodeURIComponent(phrase)}`)
    const frames: Frames[] = await framesRequest.json();

    if (frames.length === 0) {
        await interaction.send("No images found");
        return;
    }

    // Taking the first frame as the best frame
    const [selectedFrame] = frames;

    if (type === 'frame') {
        await interaction.send(`${urlBase}/img/${selectedFrame.Episode}/${selectedFrame.Timestamp}.jpg`);
        return;
    }

    if (type === 'subtitle' && textOverride) {
        const wrappedCaption = wrap(subtitleOverride, {width: 24});
        const b64lines = addPaddingToBase64url(encode(Buffer.from(wrappedCaption, 'utf-8')));
        await interaction.send(`${urlBase}/meme/${selectedFrame.Episode}/${selectedFrame.Timestamp}.jpg?b64lines=${b64lines}`);
        return;
    }
    
    const frameDataRequest = await fetch(`${urlBase}/api/caption?e=${selectedFrame.Episode}&t=${selectedFrame.Timestamp}`);
    const frameData: CaptionRequest = await frameDataRequest.json();

    const wordLoc = frameData.Subtitles.findIndex(subtitle => subtitle.Content.toLowerCase().includes(phrase.split(' ')[0]));
    const frameRange = frameData.Subtitles.slice(wordLoc)
    const caption = frameRange.reduce((cap: string, subtitle) => `${cap} ${subtitle.Content}`, '').trim();
    const wrappedCaption = wrap(caption, {width: 24});
    let b64lines = addPaddingToBase64url(encode(Buffer.from(wrappedCaption, 'utf-8')));

    if (type === 'subtitle') {
        await interaction.send(`${urlBase}/meme/${selectedFrame.Episode}/${selectedFrame.Timestamp}.jpg?b64lines=${b64lines}`);
        return;
    }

    if (type === 'gif') {
        const [startFrame] = frameRange;
        const endFrame = frameRange[frameRange.length - 1];

        if (textOverride) {
            const wrapOverride = wrap(subtitleOverride, {width: 24});
            b64lines = addPaddingToBase64url(encode(Buffer.from(wrapOverride, 'utf-8')));
        }

        await interaction.send(`${urlBase}/mp4/${startFrame.Episode}/${startFrame.StartTimestamp}/${endFrame.EndTimestamp}.mp4?b64lines=${b64lines}`)
    }
}
