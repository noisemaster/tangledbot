package main

import (
	"flag"
	"fmt"
	"time"

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

	discord.AddHandler(messageCreate)

	bot, err := discord.User("@me")
	if err != nil {
		fmt.Println("error getting bot details,", err)
		return
	}

	err = discord.Open()
	if err != nil {
		fmt.Println("error opening session,", err)
		return
	}

	fmt.Println("%s (%s) now active", bot.Username, bot.ID)
	<-make(chan struct{})
	return
}

func messageCreate(s *discordgo.Session, m *discordgo.Message) {
	fmt.Println("%20s %20s %20s > %s\n", m.ChannelID, time.Now().Format(time.Stamp), m.Author.Username, m.Content)
}
