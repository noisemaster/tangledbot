import config from '../config.ts';

const commandsURLBase = `https://discord.com/api/v8/applications/${config.discord.appID}/commands`;

const headers = {
    "Authorization": `Bot ${config.discord.token}`,
    'Content-Type': 'application/json',
    'Accepts': 'application/json'
}

const response = await fetch(commandsURLBase, {
    method: 'GET',
    headers,
});

const commands = await response.json();
const commandIds = commands.map((x: any) => x.id);

for (let id of commandIds) {
    const delResp = await fetch(`${commandsURLBase}/${id}`, {
        method: 'DELETE',
        headers,
    });
    
    // Don't get rate limited challenge 2k21
    Deno.sleepSync(1000);

    console.log(`Deleted ${id} - Response ${delResp.status}`);
}
