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

//Commands stores all commands for the bot as a map
var Commands = map[string]func(s *discordgo.Session, m *discordgo.MessageCreate){
	"--reddit":    boxbot.SendRedditPost,
	"--frinkiac":  boxbot.HandleFrinkiac,
	"--morbotron": boxbot.HandleMorbotron,
	"--choose":    boxbot.HandleChoices,
	"--help":      boxbot.SendHelpEmbed,
	"--info":      boxbot.SendInfoEmbed,
	"--server":    boxbot.SendServerInfo,
	"--leadrobot": boxbot.SendRobotQuote,
	"--fullwidth": boxbot.SendFullWidth,
	"--addtag":    boxbot.AddTag,
	"--tag":       boxbot.GetTag,
	"--listtags":  boxbot.ListTags,
	"--deletetag": boxbot.DeleteTag,
	"--dog":       boxbot.SendRandomDog,
}

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
	for command, function := range Commands {
		if strings.HasPrefix(m.Content, command) {
			go function(s, m)
			break
		}
	}
}

func onReady(s *discordgo.Session, event *discordgo.Ready) {
	fmt.Println("READY for commands")
	_ = s.UpdateStatus(0, "Boxbot.go")
}
