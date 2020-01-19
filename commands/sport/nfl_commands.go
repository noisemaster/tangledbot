package boxbot

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"

	"github.com/bwmarrin/discordgo"
)

type nflScoresResult struct {
	Season     int           `json:"season"`
	SeasonType string        `json:"seasonType"`
	Week       int           `json:"week"`
	GameScores []nflSchedule `json:"gameScores"`
}

type nflSchedule struct {
	ScheduledGame nflScheduleEntry `json:"gameSchedule"`
}

type nflScheduleEntry struct {
	GameID             int    `json:"gameId"`
	GameDate           string `json:"gameDate"`
	GameTimeEastern    string `json:"gameTimeEastern"`
	GameTimeLocal      string `json:"gameTimeLocal"`
	IsoTime            int64  `json:"isoTime"`
	HomeTeamID         string `json:"homeTeamId"`
	VisitorTeamID      string `json:"visitorTeamId"`
	HomeTeamAbbr       string `json:"homeTeamAbbr"`
	VisitorTeamAbbr    string `json:"visitorTeamAbbr"`
	HomeDisplayName    string `json:"homeDisplayName"`
	VisitorDisplayName string `json:"visitorDisplayName"`
}

// FindNFLGames shows the active games for the current week of the NFL
func FindNFLGames(s *discordgo.Session, m *discordgo.MessageCreate) {
	var results nflScoresResult
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://feeds.nfl.com/feeds-rs/scores.json", nil)
	if err != nil {
		return
	}
	req.Header.Set("User-Agent", "Boxbot_Go/0.1")
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return
	}
	if string(body) == "" {
		return
	}
	json.Unmarshal(body, &results)

	var embed discordgo.MessageEmbed
	embed.Title = "NFL Week " + strconv.Itoa(results.Week)
	var fields []*discordgo.MessageEmbedField
	for _, game := range results.GameScores {
		gameTime := time.Unix(game.ScheduledGame.IsoTime/1000, 0)
		year, month, day := gameTime.Date()

		gameField := discordgo.MessageEmbedField{
			Name:   game.ScheduledGame.VisitorDisplayName + " @ " + game.ScheduledGame.HomeDisplayName,
			Value:  month.String() + " " + strconv.Itoa(day) + ", " + strconv.Itoa(year) + " " + gameTime.Format(time.Kitchen) + " (Eastern)",
			Inline: false,
		}
		fields = append(fields, &gameField)
	}
	embed.Fields = fields

	s.ChannelMessageSendEmbed(m.ChannelID, &embed)
}
