export const ValorantCommandSchema = {
    "name": "valorant",
    "description": "View the schedule of Valorant matches (via valorantesports.com)",
    "options": [
        {
            "name": "region",
            "description": "Match region",
            "type": 3,
            "required": true,
            "choices": [
                {
                    "name": "North America",
                    "value": "105555635175479654"
                }
            ]
        }
    ]
}
