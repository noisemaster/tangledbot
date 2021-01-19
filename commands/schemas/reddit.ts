export const RedditCommandSchema = {
    "name": "reddit",
    "description": "Fetch a random post from Reddit",
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
