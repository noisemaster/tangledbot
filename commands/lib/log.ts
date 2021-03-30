import { InteractionData } from "https://deno.land/x/harmony@v1.1.4/mod.ts";
import { green, brightRed, gray, bold } from "https://deno.land/std@0.90.0/fmt/colors.ts"

export const logInteraction = ({id, name, options}: InteractionData) => {
    console.log(`[${gray(id)}] Command: ${bold(green(name))}`);
    if (options) {
        console.log(`${options.map(x => `${green(x.name)}: ${brightRed(x.value)}`).join(`\n`)}`);
    }
}