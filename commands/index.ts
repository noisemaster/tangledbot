import { logger } from '@discordeno/utils';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// const folderPath = join(__dirname, 'commands');
const folderPath = join(__dirname);

const files = readdirSync(folderPath)
    .filter(x => x.endsWith('.ts'))
    .filter(x => !x.endsWith('mod.ts'))
    .filter(x => !x.endsWith('index.ts'))!

for (let file of files) {
    logger.info(`Loading ${file}...`);
    await import(join(folderPath, file));
}
