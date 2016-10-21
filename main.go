package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"

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
			} `json:"data"`
		} `json:"children"`
	} `json:"data"`
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
		req, _ := frinkiac.GetFrinkiacFrame(parsed)
		_, _ = s.ChannelMessageSend(m.ChannelID, req)
	}
}

func messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	msg := m.Content
	fmt.Printf("%s said %s\n", m.Author.Username, m.Content)
	if strings.HasPrefix(msg, "--"+"ping") {
		_, _ = s.ChannelMessageSend(m.ChannelID, "Pong")
	} else if strings.HasPrefix(msg, "--"+"stopthepain") {
		_, _ = s.ChannelMessageSend(m.ChannelID, "https://41.media.tumblr.com/45ba426239ef6cd9cb9bd17ed43b5427/tumblr_inline_o2mejqgtvU1tkuibk_540.jpg")
	} else if strings.HasPrefix(msg, "--"+"reddit") {
		go sendRedditPost(s, m, msg[9:])
	} else if strings.HasPrefix(msg, "--"+"frinkiac") {
		go handleFrinkiac(s, m)
	} else if strings.HasPrefix(msg, "--"+"morbotron") {
		go handleMorbotron(s, m)
	} else if strings.HasPrefix(msg, "--"+"help") {
		_, _ = s.ChannelMessageSend(m.ChannelID, "```xl\nBoxbot command list\nCommands in the form of --{command}\n\tping\n\treddit {Subreddit} - Gets the newest post from a public subreddit\n\tfrinkiac {gif or cap or nothing} {search} - Gets a Gif or Caption from Frinkiac, gives a frame if gif or cap isn't given\n\tmorbotron {gif or cap or nothing} {search} - Functionally the same as --frinkiac but for Morobtron\n```")
	}
}

func onReady(s *discordgo.Session, event *discordgo.Ready) {
	fmt.Println("READY for commands")
	_ = s.UpdateStatus(0, "Boxbot.Go")
}

func sendRedditPost(s *discordgo.Session, m *discordgo.MessageCreate, sub string) {
	fmt.Println(sub)
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://www.reddit.com/r/"+sub+".json", nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	req.Header.Set("User-Agent", "Boxbot/0.1")
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
			_, _ = s.ChannelMessageSend(m.ChannelID, "Here's the lastest post from r/"+sub+"\n**"+v.Data.Title+"**\n"+v.Data.URL)
			return
		}
	}
}
