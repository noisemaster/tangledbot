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

var booruPoster map[string]booruPosterDetails

type booruPosterDetails struct {
	page         booruPage
	poster       string
	embedMessage discordgo.MessageEmbed
}

type booruPage struct {
	Rating  string   `json:"rating"`
	URL     string   `json:"file_url"`
	Tags    string   `json:"tags"`
	Score   int      `json:"score"`
	ID      int      `json:"id"`
	Artists []string `json:"artist,omitempty"`
}

func init() {
	booruPoster = make(map[string]booruPosterDetails)
}

//GetE621Image grabs a random image from e621
func GetE621Image(s *discordgo.Session, m *discordgo.MessageCreate) {
	var tagFixer = strings.NewReplacer(" ", "+")
	tags := m.Content[len("--"+"e621 "):]
	getBooruPost(s, m, "https://e621.net/post/index.json?tags="+tagFixer.Replace(tags), tags, "https://e621.net/post/show/")
}

//GetGelbooruImage grabs a random image from Gelbooru
func GetGelbooruImage(s *discordgo.Session, m *discordgo.MessageCreate) {
	tags := m.Content[len("--"+"gelbooru "):]
	getBooruPost(s, m, "https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags="+tags, tags, "https://gelbooru.com/index.php?page=post&s=view&id=")
}

func getBooruPost(s *discordgo.Session, m *discordgo.MessageCreate, request string, tags string, postURLBase string) {
	channelInfo, _ := s.Channel(m.ChannelID)
	if channelInfo.NSFW {
		var pages []booruPage
		client := &http.Client{}
		req, err := http.NewRequest("GET", request, nil)
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
		if len(page.Tags) > 1024 {
			page.Tags = "Too many to show"
		}
		embed.Fields = []*discordgo.MessageEmbedField{
			&discordgo.MessageEmbedField{Name: "Tags", Value: fixer.Replace(page.Tags)},
			&discordgo.MessageEmbedField{Name: "ID", Value: strconv.Itoa(page.ID), Inline: true},
			&discordgo.MessageEmbedField{Name: "Score", Value: strconv.Itoa(page.Score), Inline: true},
		}
		if page.Artists != nil && len(page.Artists) == 1 {
			embed.Fields = append(embed.Fields, &discordgo.MessageEmbedField{Name: "Artist", Value: page.Artists[0]})
		} else if page.Artists != nil && len(page.Artists) > 1 {
			embed.Fields = append(embed.Fields, &discordgo.MessageEmbedField{Name: "Artists", Value: strings.Join(page.Artists, ", ")})
		}
		embed.Description = "[Post Link](" + postURLBase + strconv.Itoa(page.ID) + ")\t[Direct Image Link](" + page.URL + ")"
		embed.Image = &discordgo.MessageEmbedImage{
			URL: page.URL,
		}
		embed.Footer = &discordgo.MessageEmbedFooter{
			Text: "Image " + strconv.Itoa(numChosen+1) + "/" + strconv.Itoa(len(pages)),
		}
		message, err := s.ChannelMessageSendEmbed(m.ChannelID, &embed)
		if err != nil {
			fmt.Println("Can't send message", err)
			fmt.Println("Likely due to the following page", page)
			return
		}
		s.MessageReactionAdd(m.ChannelID, message.ID, "🔞")
		booruPoster[message.ID] = booruPosterDetails{page, m.Author.ID, embed}
	}
}

//HandleBooruImageReactAdded Handles a react being added to a Gelbooru message
func HandleBooruImageReactAdded(s *discordgo.Session, r *discordgo.MessageReactionAdd) {
	if val, ok := booruPoster[r.MessageID]; ok {
		if r.UserID == val.poster {
			embed := val.embedMessage
			embed.Image = nil
			s.ChannelMessageEditEmbed(r.ChannelID, r.MessageID, &embed)
		}
	}
}

//HandleBooruImageReactRemoved Handles a react being added to a Gelbooru message
func HandleBooruImageReactRemoved(s *discordgo.Session, r *discordgo.MessageReactionRemove) {
	if val, ok := booruPoster[r.MessageID]; ok {
		if r.UserID == val.poster {
			embed := val.embedMessage
			embed.Image = &discordgo.MessageEmbedImage{URL: val.page.URL}
			s.ChannelMessageEditEmbed(r.ChannelID, r.MessageID, &embed)
		}
	}
}
