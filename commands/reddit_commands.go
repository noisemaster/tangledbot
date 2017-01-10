package boxbot

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"

	"github.com/bwmarrin/discordgo"
)

//Subreddit struct stores info about a subreddit and its posts
type Subreddit struct {
	Data struct {
		Children []struct {
			Data struct {
				URL          string `json:"url"`
				Title        string `json:"title"`
				Announcement bool   `json:"stickied"`
				SelfPostText string `json:"selftext"`
				SelfPost     bool   `json:"is_self"`
				Score        int    `json:"score"`
				NumComments  int    `json:"num_comments"`
				Domain       string `json:"domain"`
			} `json:"data"`
		} `json:"children"`
	} `json:"data"`
}

//SendRedditPost sends the first non sticked post from a subreddit (sorted by best)
func SendRedditPost(s *discordgo.Session, m *discordgo.MessageCreate) {
	if len(m.Content) < 9 {
		return
	}
	sub := m.Content[9:]
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://www.reddit.com/r/"+sub+".json", nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	req.Header.Set("User-Agent", "Boxbot/0.2")
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Println(err)
		return
	}
	var info Subreddit
	json.Unmarshal(body, &info)
	for _, v := range info.Data.Children {
		if !v.Data.Announcement {
			var e = discordgo.MessageEmbed{
				Title: v.Data.Title,
				URL:   v.Data.URL,
				Color: 0xE5343A,
			}
			e.Author = &discordgo.MessageEmbedAuthor{
				Name: "/r/" + sub,
				URL:  "https://www.reddit.com/r/" + sub,
			}
			if strings.Contains(v.Data.URL, ".jpg") || strings.Contains(v.Data.URL, ".png") || strings.Contains(v.Data.URL, ".gif") || strings.Contains(v.Data.Domain, "imgur") {
				e.Image = &discordgo.MessageEmbedImage{URL: v.Data.URL}
			} else if v.Data.SelfPost {
				e.Description += v.Data.SelfPostText
			}
			e.Fields = []*discordgo.MessageEmbedField{
				&discordgo.MessageEmbedField{Name: "Score", Value: strconv.Itoa(v.Data.Score), Inline: true},
				&discordgo.MessageEmbedField{Name: "Comments", Value: strconv.Itoa(v.Data.NumComments), Inline: true},
				&discordgo.MessageEmbedField{Name: "From", Value: v.Data.Domain, Inline: true},
			}
			s.ChannelMessageSendEmbed(m.ChannelID, &e)
			return
		}
	}
}
