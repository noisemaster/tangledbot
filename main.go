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
	if len(m.Mentions) < 0 {
		return
	}
	msg := m.ContentWithMentionsReplaced()
	parsed := strings.Split(strings.ToLower(msg), " ")
	if parsed[1] == "ping" {
		s.ChannelMessageSend(m.ChannelID, "Pong")
	}
	fmt.Printf("%s > %s\n", m.Author.Username, m.Content)
}

func onReady(s *discordgo.Session, event *discordgo.Ready) {
	s.UpdateStatus(0, "Boxbot.Go v0.0.0.0.0.0.0.1")
}
