import vega from 'vega';
import sharp from 'sharp';

export async function generateVega(schema: vega.Spec) {
    const view = new vega
        .View(vega.parse(schema))
        .renderer('none');

    const svg = await view.toSVG()
    return sharp(Buffer.from(svg))
        .toFormat('png')
        .toBuffer();
}