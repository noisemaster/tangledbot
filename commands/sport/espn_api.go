package boxbot

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
)

/// USE ENDPOINT: http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard

type espnResponse struct {
	Week   espnWeek    `json:"week"`
	Events []espnEvent `json:"events"`
}

type espnWeek struct {
	Number int `json:"number"`
}

type espnEvent struct {
	Date         string            `json:"date"`
	Name         string            `json:"name"`
	ShortName    string            `json:"shortName"`
	Competitions []espnCompetition `json:"competitions"`
}

type espnCompetition struct {
	Date        string            `json:"date"`
	Competitors []espnCompetitors `json:"competitors"`
	Broadcasts  []espnBroadcast   `json:"broadcasts"`
	Status      espnStatus        `json:"status"`
}

type espnCompetitors struct {
	HomeAway string   `json:"homeAway"`
	Winner   bool     `json:"winner"`
	Score    string   `json:"score"`
	Team     espnTeam `json:"team"`
}

type espnBroadcast struct {
	Market string   `json:"market"`
	Names  []string `json:"names"`
}

type espnTeam struct {
	Location     string `json:"location"`
	Name         string `json:"name"`
	DisplayName  string `json:"displayName"`
	LogoURL      string `json:"logo"`
	Abbreviation string `json:"abbreviation"`
}

type espnStatus struct {
	Clock        int            `json:"clock"`
	DisplayClock string         `json:"displayClock"`
	Period       int            `json:"period"`
	Type         espnStatusType `json:"type"`
}

type espnStatusType struct {
	Name        string `json:"name"`
	State       string `json:"state"`
	Completed   bool   `json:"completed"`
	Description string `json:"description"`
	Detail      string `json:"detail"`
}

func (competition *espnCompetition) find(f func(espnCompetitors) bool) (result espnCompetitors) {
	for _, val := range competition.Competitors {
		if f(val) {
			return val
		}
	}

	return
}

func fetchESPNFootball() (espnResponse, error) {
	var results espnResponse
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard", nil)
	if err != nil {
		return results, err
	}
	req.Header.Set("User-Agent", "Boxbot_Go/0.1")
	resp, err := client.Do(req)
	if err != nil {
		return results, err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return results, err
	}
	if string(body) == "" {
		return results, err
	}
	json.Unmarshal(body, &results)

	return results, nil
}
