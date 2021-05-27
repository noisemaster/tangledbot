import { InteractionApplicationCommandData } from "https://deno.land/x/harmony@v2.0.0-rc1/mod.ts";
import { green, brightRed, gray, bold } from "https://deno.land/std@0.90.0/fmt/colors.ts"

export const logInteraction = (data: InteractionApplicationCommandData | undefined) => {
    // console.log(`[${gray(id)}] Command: ${bold(green(name))}`);
    // if (options) {
    //     console.log(`${options.map(x => `${green(x.name)}: ${brightRed(`${x.value}`)}`).join(`\n`)}`);
    // }
    console.log(data);
}