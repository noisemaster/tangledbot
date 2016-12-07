package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"os/exec"
	"strings"

	"bytes"

	"strconv"

	"github.com/bwmarrin/discordgo"
	"github.com/noisemaster/frinkiacapigo"
)

var (
	//BotID so it doesn't talk to itself
	BotID string
	//BotKeys needed to run the bot and plugins
	BotKeys Config
)

//Config struct for tokens and API keys loaded from a json file
type Config struct {
	DiscordToken  string `json:"discord token"`
	GoogleAPIKey  string `json:"google api"`
	GoogleCX      string `json:"google custom search cx"`
	SoundcloudAPI string `json:"soundcloud api"`
	TumblrAPI     string `json:"tumblr api"`
}

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

//TumblrTag stuct contains info about a tumblr tag
type TumblrTag struct {
	Response []struct {
		PostURL string `json:"post_url"`
	} `json:"response"`
}

func init() {
	file, err := ioutil.ReadFile("./config.json")
	if err != nil {
		fmt.Println("Config file not loaded, does one exist?")
		return
	}
	json.Unmarshal(file, &BotKeys)
}

func main() {
	discord, err := discordgo.New(BotKeys.DiscordToken)
	if err != nil {
		fmt.Println("error creating discord session,", err)
		return
	}

	bot, err := discord.User("@me")
	if err != nil {
		fmt.Println("error getting bot details,", err)
		return
	}

	BotID = bot.ID
	discord.AddHandler(messageCreate)
	discord.AddHandler(onReady)

	err = discord.Open()
	if err != nil {
		fmt.Println("error opening session,", err)
		return
	}

	fmt.Printf("%s (%s) now active\n", bot.Username, bot.ID)
	<-make(chan struct{})
	return
}

func handleFrinkiac(s *discordgo.Session, m *discordgo.MessageCreate) {
	args := strings.Split(m.Content, " ")
	if len(args) < 2 {
		return
	}
	if args[1] == "gif" {
		parsed := strings.Join(args[2:], " ")
		req, _ := frinkiac.GetFrinkiacGifMeme(parsed)
		_, _ = s.ChannelMessageSend(m.ChannelID, req)
	} else if args[1] == "cap" {
		parsed := strings.Join(args[2:], " ")
		req, _ := frinkiac.GetFrinkiacMeme(parsed)
		_, _ = s.ChannelMessageSend(m.ChannelID, req)
	} else {
		parsed := strings.Join(args[1:], " ")
		req, _ := frinkiac.GetFrinkiacFrame(parsed)
		_, _ = s.ChannelMessageSend(m.ChannelID, req)
	}
}

func handleMorbotron(s *discordgo.Session, m *discordgo.MessageCreate) {
	args := strings.Split(m.Content, " ")
	if len(args) < 2 {
		return
	}
	if args[1] == "gif" {
		parsed := strings.Join(args[2:], " ")
		req, _ := frinkiac.GetMorbotronGifMeme(parsed)
		_, _ = s.ChannelMessageSend(m.ChannelID, req)
	} else if args[1] == "cap" {
		parsed := strings.Join(args[2:], " ")
		req, _ := frinkiac.GetMorbotronMeme(parsed)
		_, _ = s.ChannelMessageSend(m.ChannelID, req)
	} else {
		parsed := strings.Join(args[1:], " ")
		req, _ := frinkiac.GetMorbotronFrame(parsed)
		_, _ = s.ChannelMessageSend(m.ChannelID, req)
	}
}

func sendInfoEmbed(s *discordgo.Session, m *discordgo.MessageCreate) {
	var e discordgo.MessageEmbed
	e.Title = "Boxbot.go v.2"
	e.URL = "https://github.com/noisemaster/boxbot"
	//Command shamelessly stolen from https://github.com/Rapptz/RoboDanny/blob/master/cogs/meta.py#L299
	out, err := exec.Command("git", "show", "-s", "HEAD~3..HEAD", "--format=[%h](https://github.com/noisemaster/boxbot/commit/%H) - %s (%cr)").Output()
	if err != nil {
		s.ChannelMessageSendEmbed(m.ChannelID, &e)
	}
	e.Description = "**Latest Updates**\n" + string(bytes.Trim(out, " "))
	e.Color = 0xE5343A
	s.ChannelMessageSendEmbed(m.ChannelID, &e)
}

func sendServerInfo(s *discordgo.Session, m *discordgo.MessageCreate) {
	c, _ := s.Channel(m.ChannelID)
	g, err := s.Guild(c.GuildID)
	if err != nil {
		return
	}
	owner, err := s.User(g.OwnerID)
	if err != nil {
		return
	}
	var emojis string
	e := discordgo.MessageEmbed{
		Color: 0xE5343A,
	}
	e.Author = &discordgo.MessageEmbedAuthor{
		Name: g.Name,
	}
	e.Thumbnail = &discordgo.MessageEmbedThumbnail{URL: "https://cdn.discordapp.com/icons/" + c.GuildID + "/" + g.Icon + ".jpg"}
	for _, z := range g.Emojis {
		emojis += "<:" + z.Name + ":" + z.ID + "> "
	}
	e.Fields = []*discordgo.MessageEmbedField{
		&discordgo.MessageEmbedField{Name: "Owner", Value: owner.Username, Inline: true},
		&discordgo.MessageEmbedField{Name: "Members", Value: strconv.Itoa(g.MemberCount), Inline: true},
		&discordgo.MessageEmbedField{Name: "Roles", Value: strconv.Itoa(len(g.Roles)), Inline: true},
		&discordgo.MessageEmbedField{Name: "Emojis", Value: emojis},
	}
	s.ChannelMessageSendEmbed(m.ChannelID, &e)
}

func sendHelpEmbed(s *discordgo.Session, m *discordgo.MessageCreate) {
	var e discordgo.MessageEmbed
	me, err := s.User("@me")
	if err != nil {
		return
	}
	e.Author = &discordgo.MessageEmbedAuthor{
		IconURL: "https://cdn.discordapp.com/avatars/" + me.ID + "/" + me.Avatar + ".jpg",
		Name:    me.Username,
	}
	e.Color = 0xE5343A
	e.Description = "**Boxbot Commands**"
	e.Fields = []*discordgo.MessageEmbedField{
		&discordgo.MessageEmbedField{Name: "--ping", Value: "Pong!"},
		&discordgo.MessageEmbedField{Name: "--reddit <subreddit>", Value: "Checks Reddit for the latest post from a subreddit"},
		&discordgo.MessageEmbedField{Name: "--choose <choice 1 or choice 2 or ...>", Value: "Chooses a random option"},
		&discordgo.MessageEmbedField{Name: "--info", Value: "Shows the latest updates to boxbot"},
		&discordgo.MessageEmbedField{Name: "--frinkiac <search>", Value: "Gets an image from Frinkiac matching the search\n**Other Options**\n**--frinkiac cap <search>**\nGets a frame and the subtitle\n**--frinkiac gif <search>**\nGets a gif"},
		&discordgo.MessageEmbedField{Name: "--morbotron <search>", Value: "Gets an image from Morobtron matching the search\n**Other Options**\n**--morbotron cap <search>**\nGets a frame and the subtitle\n**--morbotron gif <search>**\nGets a gif"},
	}
	s.ChannelMessageSendEmbed(m.ChannelID, &e)
}

func messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	msg := m.Content
	fmt.Printf("%s said %s\n", m.Author.Username, m.Content)
	if strings.HasPrefix(msg, "--"+"ping") {
		_, _ = s.ChannelMessageSend(m.ChannelID, "Pong")
	} else if strings.HasPrefix(msg, "--"+"stopthepain") {
		_, _ = s.ChannelMessageSend(m.ChannelID, "https://41.media.tumblr.com/45ba426239ef6cd9cb9bd17ed43b5427/tumblr_inline_o2mejqgtvU1tkuibk_540.jpg")
	} else if strings.HasPrefix(msg, "--"+"reddit") {
		if len(msg) < 9 {
			return
		}
		go sendRedditPost(s, m, msg[9:])
	} else if strings.HasPrefix(msg, "--"+"frinkiac") {
		go handleFrinkiac(s, m)
	} else if strings.HasPrefix(msg, "--"+"morbotron") {
		go handleMorbotron(s, m)
	} else if strings.HasPrefix(msg, "--"+"choose") {
		if len(msg) < 9 {
			return
		}
		choices := strings.Split(msg[9:], "or")
		_, _ = s.ChannelMessageSend(m.ChannelID, "I choose **"+strings.Trim(choices[rand.Intn(len(choices))], " ")+"**")
	} else if strings.HasPrefix(msg, "--"+"help") {
		go sendHelpEmbed(s, m)
	} else if strings.HasPrefix(msg, "--"+"info") {
		go sendInfoEmbed(s, m)
	} else if strings.HasPrefix(msg, "--"+"tumblr") {
		if len(msg) < 9 {
			return
		}
		go sendTumblrPost(s, m, msg[9:])
	} else if strings.HasPrefix(msg, "--"+"server") {
		go sendServerInfo(s, m)
	}
}

func onReady(s *discordgo.Session, event *discordgo.Ready) {
	fmt.Println("READY for commands")
	_ = s.UpdateStatus(0, "Boxbot.go")
}

func sendRedditPost(s *discordgo.Session, m *discordgo.MessageCreate, sub string) {
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

func sendTumblrPost(s *discordgo.Session, m *discordgo.MessageCreate, tag string) {
	r := strings.NewReplacer(" ", "%20")
	var info TumblrTag
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://api.tumblr.com/v2/tagged?tag="+r.Replace(tag)+"&api_key="+BotKeys.TumblrAPI, nil)
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
	json.Unmarshal(body, &info)
	s.ChannelMessageSend(m.ChannelID, info.Response[rand.Intn(len(info.Response))].PostURL)
}
