export const E621CommandSchema = {
    "name": "e621",
    "description": "Fetch a random image from E621 (sends safe images only outside of NSFW channels)",
    "options": [
        {
            "name": "tag",
            "description": "Set of space separated tags to search for (use _ for tags with spaces)",
            "type": 3,
            "required": true,
        },
    ]
}