package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/bwmarrin/discordgo"
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

	err = discord.Open()
	if err != nil {
		fmt.Println("error opening session,", err)
		return
	}

	fmt.Printf("%s (%s) now active\n", bot.Username, bot.ID)
	<-make(chan struct{})
	return
}

func messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	var forBot = false
	if len(m.Mentions) < 1 || m.Author.ID == BotID {
		return
	}
	for _, user := range m.Mentions {
		if user.ID == BotID {
			forBot = true
		}
	}
	if forBot == false {
		return
	}
	msg := m.Content
	fmt.Printf("%s said %s\n", m.Author.Username, m.Content)
	if strings.HasPrefix(msg, "--"+"ping") {
		_, _ = s.ChannelMessageSend(m.ChannelID, "Pong")
	} else if strings.HasPrefix(msg, "--"+"stopthepain") {
		_, _ = s.ChannelMessageSend(m.ChannelID, "https://41.media.tumblr.com/45ba426239ef6cd9cb9bd17ed43b5427/tumblr_inline_o2mejqgtvU1tkuibk_540.jpg")
	} else {
		return
	}
}

func onReady(s *discordgo.Session, event *discordgo.Ready) {
	fmt.Println("READY for commands")
	_ = s.UpdateStatus(0, "Boxbot.Go v0.1")
}
