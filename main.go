package main

import (
	"flag"
	"fmt"
	"strings"

	"github.com/bwmarrin/discordgo"
)

var (
	//Token for bot
	Token string
	//Config for bot
	Config string
	//What's the bot's ID so it doesn't talk to itself
	BotID string
)

func init() {
	flag.StringVar(&Token, "t", "", "Account Token")
	flag.StringVar(&Config, "c", "", "Config file location")
	flag.Parse()
}

func main() {
	discord, err := discordgo.New(Token)
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
	if len(m.Mentions) < 0 || m.Author.ID == BotID {
		return
	}
	msg := m.ContentWithMentionsReplaced()
	parsed := strings.Split(strings.ToLower(msg), " ")
	fmt.Printf("%s said %s\n", m.Author.Username, m.Content)
	if parsed[1] == "ping" {
		_, _ = s.ChannelMessageSend(m.ChannelID, "Pong")
	} else if parsed[1] == "stopthepain" {
		_, _ = s.ChannelMessageSend(m.ChannelID, "https://41.media.tumblr.com/45ba426239ef6cd9cb9bd17ed43b5427/tumblr_inline_o2mejqgtvU1tkuibk_540.jpg")
	} else {
		return
	}
}

func onReady(s *discordgo.Session, event *discordgo.Ready) {
	s.UpdateStatus(0, "Boxbot.Go v0.0.0.0.0.0.0.1")
}
