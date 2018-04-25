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

var booruPoster map[string]gelbooruPosterDetails

type gelbooruPosterDetails struct {
	page         gelbooruPage
	poster       string
	embedMessage discordgo.MessageEmbed
}

type gelbooruPage struct {
	Rating string `json:"rating"`
	URL    string `json:"file_url"`
	Tags   string `json:"tags"`
	Score  int    `json:"score"`
	ID     int    `json:"id"`
}

func init() {
	booruPoster = make(map[string]gelbooruPosterDetails)
}

//GetGelbooruImage grabs a random image from Gelbooru
func GetGelbooruImage(s *discordgo.Session, m *discordgo.MessageCreate) {
	channelInfo, _ := s.Channel(m.ChannelID)
	if channelInfo.NSFW {
		var pages []gelbooruPage
		tags := m.Content[len("--"+"gelbooru "):]
		client := &http.Client{}
		req, err := http.NewRequest("GET", "https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags="+tags, nil)
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
			s.ChannelMessageSend(m.ChannelID, "Nothing found for "+tags)
			return
		}
		json.Unmarshal(body, &pages)
		var numChosen = rand.Intn(len(pages))
		var page = pages[numChosen]
		var fixer = strings.NewReplacer("_", "\\_")
		var embed discordgo.MessageEmbed
		if page.Rating == "s" {
			embed.Color = 0x009e51
		} else if page.Rating == "q" {
			embed.Color = 0xf9db43
		} else {
			embed.Color = 0xf40804
		}
		embed.Author = &discordgo.MessageEmbedAuthor{
			Name:    m.Author.Username,
			IconURL: m.Author.AvatarURL("256"),
		}
		embed.Fields = []*discordgo.MessageEmbedField{
			&discordgo.MessageEmbedField{Name: "Tags", Value: fixer.Replace(page.Tags)},
			&discordgo.MessageEmbedField{Name: "ID", Value: strconv.Itoa(page.ID), Inline: true},
			&discordgo.MessageEmbedField{Name: "Score", Value: strconv.Itoa(page.Score), Inline: true},
		}
		embed.Description = "[Image Link](" + page.URL + ")"
		embed.Image = &discordgo.MessageEmbedImage{
			URL: page.URL,
		}
		embed.Footer = &discordgo.MessageEmbedFooter{
			Text: "Image " + strconv.Itoa(numChosen+1) + "/" + strconv.Itoa(len(pages)),
		}
		message, err := s.ChannelMessageSendEmbed(m.ChannelID, &embed)
		if err != nil {
			fmt.Println(err)
		}
		s.MessageReactionAdd(m.ChannelID, message.ID, "🔞")
		booruPoster[message.ID] = gelbooruPosterDetails{page, m.Author.ID, embed}
	}
}

//HandleGelbooruImageReactAdded Handles a react being added to a Gelbooru message
func HandleGelbooruImageReactAdded(s *discordgo.Session, r *discordgo.MessageReactionAdd) {
	if val, ok := booruPoster[r.MessageID]; ok {
		if r.UserID == val.poster {
			embed := val.embedMessage
			embed.Image = nil
			s.ChannelMessageEditEmbed(r.ChannelID, r.MessageID, &embed)
		}
	}
}

//HandleGelbooruImageReactRemoved Handles a react being added to a Gelbooru message
func HandleGelbooruImageReactRemoved(s *discordgo.Session, r *discordgo.MessageReactionRemove) {
	if val, ok := booruPoster[r.MessageID]; ok {
		if r.UserID == val.poster {
			embed := val.embedMessage
			embed.Image = &discordgo.MessageEmbedImage{URL: val.page.URL}
			s.ChannelMessageEditEmbed(r.ChannelID, r.MessageID, &embed)
		}
	}
}
