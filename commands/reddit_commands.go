package boxbot

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"strconv"
	"strings"

	"github.com/bwmarrin/discordgo"
)

type subredditPost struct {
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
}

type subreddit struct {
	Data struct {
		Children []subredditPost `json:"children"`
	} `json:"data"`
}

func (s *subreddit) filter(f func(subredditPost) bool) (filtered []subredditPost) {
	for _, val := range s.Data.Children {
		if f(val) {
			filtered = append(filtered, val)
		}
	}
	return
}

//SendRedditPost sends the first non sticked post from a subreddit (sorted by best)
func SendRedditPost(s *discordgo.Session, m *discordgo.MessageCreate) {
	args := strings.Split(m.Content, " ")
	if len(args) < 2 {
		return
	}
	if args[1] == "rand" {
		sendRedditPost(s, m, args[2], true)
	} else {
		sendRedditPost(s, m, args[1], false)
	}
}

func sendRedditPost(s *discordgo.Session, m *discordgo.MessageCreate, sub string, random bool) {
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
	var info subreddit
	json.Unmarshal(body, &info)
	if random {
		posts := info.filter(func(p subredditPost) bool {
			return strings.Contains(p.Data.URL, ".jpg") || strings.Contains(p.Data.URL, ".png") || strings.Contains(p.Data.URL, ".gif")
		})
		post := posts[rand.Intn(len(posts))]
		var e = discordgo.MessageEmbed{
			Title: post.Data.Title,
			URL:   post.Data.URL,
			Color: 0xE5343A,
		}
		e.Author = &discordgo.MessageEmbedAuthor{
			Name: "/r/" + sub,
			URL:  "https://www.reddit.com/r/" + sub,
		}
		e.Image = &discordgo.MessageEmbedImage{URL: post.Data.URL}
		e.Fields = []*discordgo.MessageEmbedField{
			&discordgo.MessageEmbedField{Name: "Score", Value: strconv.Itoa(post.Data.Score), Inline: true},
			&discordgo.MessageEmbedField{Name: "Comments", Value: strconv.Itoa(post.Data.NumComments), Inline: true},
			&discordgo.MessageEmbedField{Name: "From", Value: post.Data.Domain, Inline: true},
		}
		s.ChannelMessageSendEmbed(m.ChannelID, &e)
	} else {
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
}
