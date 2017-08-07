package boxbot

import (
	"bytes"
	"os/exec"
	"strconv"

	"github.com/bwmarrin/discordgo"
)

//SendInfoEmbed sends a message containing the bot's version, a link to the repo, and the latest commits
func SendInfoEmbed(s *discordgo.Session, m *discordgo.MessageCreate) {
	var e discordgo.MessageEmbed
	me, err := s.User("@me")
	if err != nil {
		return
	}
	e.Author = &discordgo.MessageEmbedAuthor{
		IconURL: "https://cdn.discordapp.com/avatars/" + me.ID + "/" + me.Avatar + ".jpg",
		Name:    me.Username,
	}
	e.Title = "Boxbot.go"
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

//SendHelpEmbed sends a message containing the bot's commands
func SendHelpEmbed(s *discordgo.Session, m *discordgo.MessageCreate) {
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
		&discordgo.MessageEmbedField{Name: "--frinkiac <search>", Value: "Gets an image from [Frinkiac](https://frinkiac.com/) matching the search\n**Other Options**\n**--frinkiac cap <search>**\nGets a frame and the subtitle\n**--frinkiac gif <search>**\nGets a gif"},
		&discordgo.MessageEmbedField{Name: "--morbotron <search>", Value: "Gets an image from [Morobtron](https://morbotron.com/) matching the search\n**Other Options**\n**--morbotron cap <search>**\nGets a frame and the subtitle\n**--morbotron gif <search>**\nGets a gif"},
		&discordgo.MessageEmbedField{Name: "--moas <search>", Value: "Gets an image from [Master of All Science](https://masterofallscience.com/) matching the search\n**Other Options**\n**--moas cap <search>**\nGets a frame and the subtitle\n**--moas gif <search>**\nGets a gif"},
		&discordgo.MessageEmbedField{Name: "--tag <tag>", Value: "Gets a tag from the database\nUse **--listtags** to find the tags for your server\nUse**--addtag <tag> <info>** to add a tag"},
		&discordgo.MessageEmbedField{Name: "--dog <breed (optional)>", Value: "Gets a random dog picture\nUse **--listdogs** to find out what breeds you can put in"},
	}
	s.ChannelMessageSendEmbed(m.ChannelID, &e)
}

//SendServerInfo sends a message with information about a server
func SendServerInfo(s *discordgo.Session, m *discordgo.MessageCreate) {
	c, _ := s.Channel(m.ChannelID)
	g, err := s.Guild(c.GuildID)
	if err != nil {
		return
	}
	owner, err := s.User(g.OwnerID)
	if err != nil {
		return
	}
	var emojis int
	e := discordgo.MessageEmbed{
		Color: 0xE5343A,
	}
	e.Author = &discordgo.MessageEmbedAuthor{
		Name: g.Name,
	}
	e.Thumbnail = &discordgo.MessageEmbedThumbnail{URL: "https://cdn.discordapp.com/icons/" + c.GuildID + "/" + g.Icon + ".jpg"}
	for _ = range g.Emojis {
		emojis += 1
	}
	e.Fields = []*discordgo.MessageEmbedField{
		&discordgo.MessageEmbedField{Name: "Owner", Value: owner.Username, Inline: true},
		&discordgo.MessageEmbedField{Name: "Members", Value: strconv.Itoa(g.MemberCount), Inline: true},
		&discordgo.MessageEmbedField{Name: "Roles", Value: strconv.Itoa(len(g.Roles)), Inline: true},
		&discordgo.MessageEmbedField{Name: "# of Emojis", Value: strconv.Itoa(emojis)},
	}
	s.ChannelMessageSendEmbed(m.ChannelID, &e)
}
