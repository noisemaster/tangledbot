import { logger } from "@discordeno/utils";
import { readdirSync } from "fs";
import { join } from "path";

// const folderPath = join(__dirname, 'commands');
const folderPath = join(__dirname);

export interface CommandLoadResult {
  failed: string[];
  loaded: string[];
}

export async function loadCommands(): Promise<CommandLoadResult> {
  const files = readdirSync(folderPath)
    .filter((file) => file.endsWith(".ts"))
    .filter((file) => file !== "mod.ts")
    .filter((file) => file !== "index.ts");

  const results = await Promise.allSettled(
    files.map(async (file) => {
      logger.info(`Loading ${file}...`);
      await import(join(folderPath, file));
      return file;
    }),
  );

  const loaded: string[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    const file = files[index];

    if (result.status === "fulfilled") {
      loaded.push(file);
      return;
    }

    failed.push(file);
    logger.error(`Failed to load command module ${file}`, result.reason);
  });

  return { failed, loaded };
}
