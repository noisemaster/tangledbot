import config from './config.ts';
const url = `https://discord.com/api/v8/applications/${config.discord.appID}/commands`;
// const url = `https://discord.com/api/v8/applications/${config.discord.appID}/guilds/${config.discord.testingGuildID}/commands`;

/* const commandRequest = {
    "name": "nfl",
    "description": "Get current NFL games",
    /* "options": [
        {
            "name": "animal",
            "description": "The type of animal",
            "type": 3,
            "required": True,
            "choices": [
                {
                    "name": "Dog",
                    "value": "animal_dog"
                },
                {
                    "name": "Cat",
                    "value": "animal_dog"
                },
                {
                    "name": "Penguin",
                    "value": "animal_penguin"
                }
            ]
        },
        {
            "name": "only_smol",
            "description": "Whether to show only baby animals",
            "type": 5,
            "required": False
        }
    ]
} 
*/

const commandRequest = {
    "name": "reddit",
    "description": "Fetch a random post from reddit",
    "options": [
        {
            "name": "subreddit",
            "description": "Subreddit to get posts from",
            "type": 3,
            "required": true,
        },
        {
            "name": "image",
            "description": "Get a random image from a subreddit",
            "type": 5,
            "required": false,
        },
    ]
}

const headers = {
    "Authorization": `Bot ${config.discord.token}`,
    'Content-Type': 'application/json',
    'Accepts': 'application/json'
}

const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(commandRequest),
    headers,
});

console.dir(await response.json(), {depth: 10})