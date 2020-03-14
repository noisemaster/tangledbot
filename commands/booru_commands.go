package boxbot

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/bwmarrin/discordgo"
)

var booruPoster map[string]booruPosterDetails
var posterMutex *sync.Mutex

type booruPosterDetails struct {
	page         booruPage
	poster       string
	embedMessage discordgo.MessageEmbed
}

type booruPage struct {
	Rating    string   `json:"rating"`
	URL       string   `json:"file_url"`
	Tags      string   `json:"tags"`
	Score     int      `json:"score"`
	ID        int      `json:"id"`
	Artists   []string `json:"artist,omitempty"`
	Timestamp string   `json:"created_at"`
}

type e621Page struct {
	Posts []e621Post `json:"posts"`
}

type e621Post struct {
	ID        int       `json:"id"`
	File      e621File  `json:"file"`
	Score     e621Score `json:"score"`
	Tags      e621Tags  `json:"tags"`
	Rating    string    `json:"rating"`
	Timestamp string    `json:"created_at"`
}

type e621File struct {
	Width  int    `json:"width"`
	Height int    `json:"height"`
	URL    string `json:"url"`
}

type e621Score struct {
	Up    int `json:"up"`
	Down  int `json:"down"`
	Total int `json:"total"`
}

type e621Tags struct {
	General   []string `json:"general"`
	Species   []string `json:"species"`
	Character []string `json:"character"`
	Copyright []string `json:"copyright"`
	Artist    []string `json:"artist"`
	Invalid   []string `json:"invalid"`
	Lore      []string `json:"lore"`
	Meta      []string `json:"meta"`
}

func init() {
	booruPoster = make(map[string]booruPosterDetails)
	posterMutex = &sync.Mutex{}
}

//GetE621Image grabs a random image from e621
func GetE621Image(s *discordgo.Session, m *discordgo.MessageCreate) {
	channelInfo, _ := s.Channel(m.ChannelID)
	if !channelInfo.NSFW {
		m.Content = m.Content + " rating:safe"
	}
	var tagFixer = strings.NewReplacer(" ", "+")
	tags := m.Content[len("--"+"e621 "):]
	getE621Post(s, m, "https://e621.net/posts.json?tags="+tagFixer.Replace(tags), tags, "https://e621.net/posts/")
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
		if len(pages) == 0 {
			s.ChannelMessageSend(m.ChannelID, "Nothing found for "+tags)
			return
		}
		var numChosen = rand.Intn(len(pages))
		var page = pages[numChosen]
		var formatter = strings.NewReplacer("_", "\\_", "&#039;", "'", "&gt;", ">", "&lt;", "<")
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
		if len(page.Tags) > 900 {
			page.Tags = strconv.Itoa(len(strings.Split(page.Tags, " "))) + " Tags"
		}
		embed.Fields = []*discordgo.MessageEmbedField{
			&discordgo.MessageEmbedField{Name: "Tags", Value: formatter.Replace(page.Tags)},
			&discordgo.MessageEmbedField{Name: "ID", Value: strconv.Itoa(page.ID), Inline: true},
			&discordgo.MessageEmbedField{Name: "Score", Value: strconv.Itoa(page.Score), Inline: true},
		}
		if page.Artists != nil && len(page.Artists) == 1 {
			embed.Fields = append(embed.Fields, &discordgo.MessageEmbedField{Name: "Artist", Value: formatter.Replace(page.Artists[0])})
		} else if page.Artists != nil && len(page.Artists) > 1 {
			embed.Fields = append(embed.Fields, &discordgo.MessageEmbedField{Name: "Artists", Value: formatter.Replace(strings.Join(page.Artists, ", "))})
		}
		embed.Description = "[Post Link](" + postURLBase + strconv.Itoa(page.ID) + ")\t[Direct Image Link](" + page.URL + ")"
		embed.Image = &discordgo.MessageEmbedImage{
			URL: page.URL,
		}
		embed.Footer = &discordgo.MessageEmbedFooter{
			Text: "Image " + strconv.Itoa(numChosen+1) + "/" + strconv.Itoa(len(pages)),
		}
		timestamp, _ := time.Parse(time.RubyDate, page.Timestamp)
		embed.Timestamp = strings.TrimRight(timestamp.UTC().Format(time.RFC3339), "Z")
		message, err := s.ChannelMessageSendEmbed(m.ChannelID, &embed)
		if err != nil {
			fmt.Println("Can't send message", err)
			fmt.Println("Likely due to the following page", page)
			return
		}
		s.MessageReactionAdd(m.ChannelID, message.ID, "🙅")
		posterMutex.Lock()
		booruPoster[message.ID] = booruPosterDetails{page, m.Author.ID, embed}
		posterMutex.Unlock()
	}
}

func getE621Post(s *discordgo.Session, m *discordgo.MessageCreate, request string, tags string, postURLBase string) {
	var e6page e621Page
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
	json.Unmarshal(body, &e6page)
	var posts = e6page.Posts
	if len(posts) == 0 {
		s.ChannelMessageSend(m.ChannelID, "Nothing found for "+tags)
		return
	}
	var numChosen = rand.Intn(len(posts))
	var post = posts[numChosen]
	var formatter = strings.NewReplacer("_", "\\_", "&#039;", "'", "&gt;", ">", "&lt;", "<")
	var embed discordgo.MessageEmbed
	if post.Rating == "s" {
		embed.Color = 0x009e51
	} else if post.Rating == "q" {
		embed.Color = 0xf9db43
	} else {
		embed.Color = 0xf40804
	}
	embed.Author = &discordgo.MessageEmbedAuthor{
		Name:    m.Author.Username,
		IconURL: m.Author.AvatarURL("256"),
	}
	var postTags = strings.Join(post.Tags.Character, " ") + "\n" +
		strings.Join(post.Tags.Copyright, " ") + "\n" +
		strings.Join(post.Tags.General, " ") + "\n" +
		strings.Join(post.Tags.Lore, " ") + "\n" +
		strings.Join(post.Tags.Meta, " ") + "\n" +
		strings.Join(post.Tags.Species, " ") + "\n" +
		strings.Join(post.Tags.Invalid, " ")

	var tagCount = len(post.Tags.Character) +
		len(post.Tags.Copyright) +
		len(post.Tags.General) +
		len(post.Tags.Lore) +
		len(post.Tags.Meta) +
		len(post.Tags.Species) +
		len(post.Tags.Invalid)

	if len(postTags) > 900 {
		postTags = strconv.Itoa(tagCount) + " Tags"
	}

	embed.Fields = []*discordgo.MessageEmbedField{
		&discordgo.MessageEmbedField{Name: "Tags", Value: formatter.Replace(postTags)},
		&discordgo.MessageEmbedField{Name: "ID", Value: strconv.Itoa(post.ID), Inline: true},
		&discordgo.MessageEmbedField{Name: "Score", Value: strconv.Itoa(post.Score.Total), Inline: true},
	}
	if post.Tags.Artist != nil && len(post.Tags.Artist) == 1 {
		embed.Fields = append(embed.Fields, &discordgo.MessageEmbedField{Name: "Artist", Value: formatter.Replace(post.Tags.Artist[0])})
	} else if post.Tags.Artist != nil && len(post.Tags.Artist) > 1 {
		embed.Fields = append(embed.Fields, &discordgo.MessageEmbedField{Name: "Artists", Value: formatter.Replace(strings.Join(post.Tags.Artist, ", "))})
	}
	embed.Description = "[Post Link](" + postURLBase + strconv.Itoa(post.ID) + ")\t[Direct Image Link](" + post.File.URL + ")"
	embed.Image = &discordgo.MessageEmbedImage{
		URL: post.File.URL,
	}
	embed.Footer = &discordgo.MessageEmbedFooter{
		Text: "Image " + strconv.Itoa(numChosen+1) + "/" + strconv.Itoa(len(posts)),
	}
	timestamp, _ := time.Parse("2006-01-02T15:04:05.999-07:00", post.Timestamp)
	embed.Timestamp = strings.TrimRight(timestamp.UTC().Format(time.RFC3339), "Z")
	message, err := s.ChannelMessageSendEmbed(m.ChannelID, &embed)
	if err != nil {
		fmt.Println("Can't send message", err)
		fmt.Println("Likely due to the following page", post)
		return
	}
	s.MessageReactionAdd(m.ChannelID, message.ID, "🙅")
	var conformedPost = booruPage{
		Artists:   post.Tags.Artist,
		ID:        post.ID,
		Rating:    post.Rating,
		Score:     post.Score.Total,
		Tags:      postTags,
		Timestamp: post.Timestamp,
		URL:       post.File.URL,
	}
	posterMutex.Lock()
	booruPoster[message.ID] = booruPosterDetails{conformedPost, m.Author.ID, embed}
	posterMutex.Unlock()
}

//HandleBooruImageReactAdded Handles a react being added to a Gelbooru message
func HandleBooruImageReactAdded(s *discordgo.Session, r *discordgo.MessageReactionAdd) {
	posterMutex.Lock()
	if val, ok := booruPoster[r.MessageID]; ok {
		if r.UserID == val.poster {
			embed := val.embedMessage
			embed.Image = nil
			s.ChannelMessageEditEmbed(r.ChannelID, r.MessageID, &embed)
		}
	}
	posterMutex.Unlock()
}

//HandleBooruImageReactRemoved Handles a react being added to a Gelbooru message
func HandleBooruImageReactRemoved(s *discordgo.Session, r *discordgo.MessageReactionRemove) {
	posterMutex.Lock()
	if val, ok := booruPoster[r.MessageID]; ok {
		if r.UserID == val.poster {
			embed := val.embedMessage
			embed.Image = &discordgo.MessageEmbedImage{URL: val.page.URL}
			s.ChannelMessageEditEmbed(r.ChannelID, r.MessageID, &embed)
		}
	}
	posterMutex.Unlock()
}
