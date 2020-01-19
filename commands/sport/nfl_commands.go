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
	Score         nflScore         `json:"score,omitempty"`
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

type nflScore struct {
	Time               string              `json:"time,omitempty"`
	Down               int                 `json:"down,omitempty"`
	YardsToGo          int                 `json:"yardsToGo,omitempty"`
	Yardline           string              `json:"yardline,omitempty"`
	YardlineSide       string              `json:"yardlineSide,omitempty"`
	YardlineNumber     int                 `json:"yardlineNumber,omitempty"`
	Phase              string              `json:"phase,omitempty"`
	PhaseDescription   string              `json:"phaseDescription,omitempty"`
	PossessionTeamID   string              `json:"possessionTeamID,omitempty"`
	PossessionTeamAbbr string              `json:"possessionTeamAbbr,omitempty"`
	RedZone            bool                `json:"redZone,omitempty"`
	VisitorTeamScore   nflTeamQuarterScore `json:"visitorTeamScore,omitempty"`
	HomeTeamScore      nflTeamQuarterScore `json:"homeTeamScore,omitempty"`
}

type nflTeamQuarterScore struct {
	PointTotal        int `json:"pointTotal,omitempty"`
	PointQ1           int `json:"pointQ1,omitempty"`
	PointQ2           int `json:"pointQ2,omitempty"`
	PointQ3           int `json:"pointQ3,omitempty"`
	PointQ4           int `json:"pointQ4,omitempty"`
	PointOT           int `json:"pointOT,omitempty"`
	TimeoutsRemaining int `json:"timeoutsRemaining,omitempty"`
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
		currentTime := time.Now()

		var scoreString string
		timeString := month.String() + " " + strconv.Itoa(day) + ", " + strconv.Itoa(year) + " " + gameTime.Format(time.Kitchen) + " (Eastern)"
		var finalValue string

		if currentTime.Unix() > gameTime.Unix() {
			scoreString = game.ScheduledGame.VisitorTeamAbbr + " " + strconv.Itoa(game.Score.VisitorTeamScore.PointTotal) + " - " + game.ScheduledGame.HomeTeamAbbr + " " + strconv.Itoa(game.Score.HomeTeamScore.PointTotal)
			if game.Score.Phase != "FINAL" {
				timeString = "<:live:668567946997792800> LIVE:"
			}
		}

		if scoreString != "" {
			finalValue = timeString + " " + game.Score.PhaseDescription + " ||" + scoreString + "||"
		} else {
			finalValue = timeString
		}

		gameField := discordgo.MessageEmbedField{
			Name:   game.ScheduledGame.VisitorDisplayName + " @ " + game.ScheduledGame.HomeDisplayName,
			Value:  finalValue,
			Inline: false,
		}
		fields = append(fields, &gameField)
	}
	embed.Fields = fields

	s.ChannelMessageSendEmbed(m.ChannelID, &embed)
}
