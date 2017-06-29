package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/bwmarrin/discordgo"
	"github.com/noisemaster/boxbot/commands"
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

func main() {
	file, err := ioutil.ReadFile("./config.json")
	if err != nil {
		fmt.Println("Config file not loaded, does one exist?")
		return
	}
	json.Unmarshal(file, &BotKeys)

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

func messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	msg := m.Content
	fmt.Printf("%s said %s\n", m.Author.Username, m.Content)
	if strings.HasPrefix(msg, "--"+"ping") {
		_, _ = s.ChannelMessageSend(m.ChannelID, "Pong")
	} else if strings.HasPrefix(msg, "--"+"reddit") {
		go boxbot.SendRedditPost(s, m)
	} else if strings.HasPrefix(msg, "--"+"frinkiac") {
		go boxbot.HandleFrinkiac(s, m)
	} else if strings.HasPrefix(msg, "--"+"morbotron") {
		go boxbot.HandleMorbotron(s, m)
	} else if strings.HasPrefix(msg, "--"+"choose") {
		go boxbot.HandleChoices(s, m)
	} else if strings.HasPrefix(msg, "--"+"help") {
		go boxbot.SendHelpEmbed(s, m)
	} else if strings.HasPrefix(msg, "--"+"info") {
		go boxbot.SendInfoEmbed(s, m)
	} else if strings.HasPrefix(msg, "--"+"tumblr") {
		go boxbot.SendTumblrPost(s, m, BotKeys.TumblrAPI)
	} else if strings.HasPrefix(msg, "--"+"server") {
		go boxbot.SendServerInfo(s, m)
	} else if strings.HasPrefix(msg, "--"+"leadrobot") {
		go boxbot.SendRobotQuote(s, m)
	} else if strings.HasPrefix(msg, "--"+"fullwidth") {
		go boxbot.SendFullWidth(s, m)
	}
}

func onReady(s *discordgo.Session, event *discordgo.Ready) {
	fmt.Println("READY for commands")
	_ = s.UpdateStatus(0, "Boxbot.go")
}
