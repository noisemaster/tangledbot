package boxbot

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
)

type subredditPost struct {
	Data struct {
		URL          string  `json:"url"`
		Title        string  `json:"title"`
		Announcement bool    `json:"stickied"`
		SelfPostText string  `json:"selftext"`
		SelfPost     bool    `json:"is_self"`
		Score        int     `json:"score"`
		NumComments  int     `json:"num_comments"`
		Domain       string  `json:"domain"`
		NSFW         bool    `json:"over_18"`
		Permalink    string  `json:"permalink"`
		Subreddit    string  `json:"subreddit"`
		CreatedUTC   float64 `json:"created_utc"`
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
	if strings.ToLower(args[1]) == "rand" {
		sendRedditPost(s, m, args[2], true)
	} else {
		sendRedditPost(s, m, args[1], false)
	}
}

func sendRedditPost(s *discordgo.Session, m *discordgo.MessageCreate, sub string, random bool) {
	client := &http.Client{}
	channelInfo, _ := s.Channel(m.ChannelID)
	req, err := http.NewRequest("GET", "https://www.reddit.com/r/"+sub+".json?limit=100", nil)
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
	isImage := func(p subredditPost) bool {
		return strings.Contains(p.Data.URL, ".jpg") || strings.Contains(p.Data.URL, ".png") || (strings.Contains(p.Data.URL, ".gif") && !strings.HasSuffix(p.Data.URL, ".gifv"))
	}
	if len(info.Data.Children) == 0 {
		s.ChannelMessageSend(m.ChannelID, "No posts found")
		return
	}
	if random {
		posts := info.filter(isImage)
		if len(posts) == 0 {
			s.ChannelMessageSend(m.ChannelID, "No images found in r/"+info.Data.Children[0].Data.Subreddit)
			return
		}
		randomPostNo := rand.Intn(len(posts))
		post := posts[randomPostNo]
		var e = discordgo.MessageEmbed{
			Title:       post.Data.Title,
			URL:         post.Data.URL,
			Color:       0xE5343A,
			Description: "[View Comments](https://www.reddit.com" + post.Data.Permalink + ")",
		}
		e.Author = &discordgo.MessageEmbedAuthor{
			Name: "/r/" + post.Data.Subreddit,
			URL:  "https://www.reddit.com/r/" + post.Data.Subreddit,
		}
		e.Image = &discordgo.MessageEmbedImage{URL: post.Data.URL}
		e.Fields = []*discordgo.MessageEmbedField{
			&discordgo.MessageEmbedField{Name: "Score", Value: strconv.Itoa(post.Data.Score), Inline: true},
			&discordgo.MessageEmbedField{Name: "Comments", Value: strconv.Itoa(post.Data.NumComments), Inline: true},
			&discordgo.MessageEmbedField{Name: "From", Value: post.Data.Domain, Inline: true},
		}
		timestamp := time.Unix(int64(post.Data.CreatedUTC), 0)
		e.Timestamp = strings.TrimRight(timestamp.Format(time.RFC3339), "Z")
		e.Footer = &discordgo.MessageEmbedFooter{
			Text: "Image " + strconv.Itoa(randomPostNo+1) + "/" + strconv.Itoa(len(posts)),
		}
		var message *discordgo.Message
		if post.Data.NSFW && channelInfo.NSFW {
			message, err = s.ChannelMessageSendEmbed(m.ChannelID, &e)
		} else if post.Data.NSFW && !channelInfo.NSFW {
			s.ChannelMessageSend(m.ChannelID, "This is not an NSFW channel")
			return
		} else {
			message, err = s.ChannelMessageSendEmbed(m.ChannelID, &e)
		}
		if err != nil {
			s.ChannelMessageSend(m.ChannelID, "Message failed to send")
			fmt.Println("Can't send message", err)
			fmt.Println("Likely due to the following post", post)
			return
		}
		s.MessageReactionAdd(m.ChannelID, message.ID, "🙅")
		posterMutex.Lock()
		booruPoster[message.ID] = booruPosterDetails{booruPage{URL: post.Data.URL}, m.Author.ID, e}
		posterMutex.Unlock()
	} else {
		for _, v := range info.Data.Children {
			if !v.Data.Announcement {
				var e = discordgo.MessageEmbed{
					Title:       v.Data.Title,
					URL:         v.Data.URL,
					Color:       0xE5343A,
					Description: "[View Comments](https://www.reddit.com" + v.Data.Permalink + ")\n",
				}
				e.Author = &discordgo.MessageEmbedAuthor{
					Name: "/r/" + v.Data.Subreddit,
					URL:  "https://www.reddit.com/r/" + v.Data.Subreddit,
				}
				if isImage(v) {
					e.Image = &discordgo.MessageEmbedImage{URL: v.Data.URL}
				} else if v.Data.SelfPost && len(v.Data.SelfPostText) > 900 {
					e.Description += v.Data.SelfPostText[:900] + "..."
				} else if v.Data.SelfPost {
					e.Description += v.Data.SelfPostText
				}
				e.Fields = []*discordgo.MessageEmbedField{
					&discordgo.MessageEmbedField{Name: "Score", Value: strconv.Itoa(v.Data.Score), Inline: true},
					&discordgo.MessageEmbedField{Name: "Comments", Value: strconv.Itoa(v.Data.NumComments), Inline: true},
					&discordgo.MessageEmbedField{Name: "From", Value: v.Data.Domain, Inline: true},
				}
				timestamp := time.Unix(int64(v.Data.CreatedUTC), 0)
				e.Timestamp = strings.TrimRight(timestamp.Format(time.RFC3339), "Z")
				var message *discordgo.Message
				if v.Data.NSFW && channelInfo.NSFW {
					message, err = s.ChannelMessageSendEmbed(m.ChannelID, &e)
				} else if v.Data.NSFW && !channelInfo.NSFW {
					s.ChannelMessageSend(m.ChannelID, "This is not an NSFW channel")
					return
				} else {
					message, err = s.ChannelMessageSendEmbed(m.ChannelID, &e)
				}
				if err != nil {
					s.ChannelMessageSend(m.ChannelID, "Message failed to send")
					fmt.Println("Can't send message", err)
					fmt.Println("Likely due to the following post", v)
					return
				}
				if isImage(v) {
					s.MessageReactionAdd(m.ChannelID, message.ID, "🙅")
					posterMutex.Lock()
					booruPoster[message.ID] = booruPosterDetails{booruPage{URL: v.Data.URL}, m.Author.ID, e}
					posterMutex.Unlock()
				}
				return
			}
		}
	}
}
