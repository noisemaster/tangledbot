package boxbot

import (
	"fmt"
	"strings"

	"github.com/boltdb/bolt"
	"github.com/bwmarrin/discordgo"
)

// AddTag adds a tag into a database. It is split up by server (GuildID)
// Command format: --addtag [tag_name] [content]
func AddTag(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Getting the Server's ID
	channel, err := s.Channel(m.ChannelID)
	args := strings.Split(m.ContentWithMentionsReplaced(), " ")
	if len(args) < 3 {
		s.ChannelMessageSend(m.ChannelID, "Not enough arguments.\nExpected: --addtag [tag name] [content]")
		return
	}
	content := strings.Join(args[2:], " ")

	db, err := bolt.Open("storage/tags.db", 0600, nil)
	if err != nil {
		fmt.Printf("Error opening db, %s\n", err)
	}
	defer db.Close()

	err = db.Update(func(tx *bolt.Tx) error {
		b, uperr := tx.CreateBucketIfNotExists([]byte(channel.GuildID))
		if uperr != nil {
			return fmt.Errorf("create bucket: %s", err)
		}
		uperr = b.Put([]byte(args[1]), []byte(content))
		if uperr != nil {
			return fmt.Errorf("create bucket: %s", err)
		}
		return nil
	})

	s.ChannelMessageSend(m.ChannelID, ":white_check_mark:")
}

// GetTag gets a tag from the TagDB
// Command format: --tag [tag_name]
func GetTag(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Getting the Server's ID
	channel, err := s.Channel(m.ChannelID)
	if err != nil {
		fmt.Println("Error getting channel")
	}
	tag := strings.Trim(m.Content[5:], " ")

	db, err := bolt.Open("storage/tags.db", 0600, nil)
	if err != nil {
		fmt.Printf("Error opening db, %s\n", err)
	}
	defer db.Close()

	var content string
	err = db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(channel.GuildID))
		v := b.Get([]byte(tag))
		content = string(v[:])
		return nil
	})

	if content == "" {
		s.ChannelMessageSend(m.ChannelID, "Tag not found")
	} else {
		s.ChannelMessageSend(m.ChannelID, content)
	}
}

// ListTags sends out a list of all tags for this server
func ListTags(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Getting the Server's ID
	channel, err := s.Channel(m.ChannelID)
	if err != nil {
		fmt.Println("Error getting channel")
	}

	db, err := bolt.Open("storage/tags.db", 0600, nil)
	if err != nil {
		fmt.Printf("Error opening db, %s\n", err)
	}
	defer db.Close()

	guild, err := s.Guild(channel.GuildID)

	var tagList = []string{"**Tags for " + guild.Name + "**"}
	err = db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(channel.GuildID))
		c := b.Cursor()
		for k, _ := c.First(); k != nil; k, _ = c.Next() {
			tagList = append(tagList, string(k[:]))
		}
		return nil
	})

	s.ChannelMessageSend(m.ChannelID, strings.Join(tagList, "\n"))
}

//DeleteTag removes a tag from the database
//Command format: --deletetag [tag_name]
func DeleteTag(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Getting the Server's ID
	channel, err := s.Channel(m.ChannelID)
	if err != nil {
		fmt.Println("Error getting channel")
	}

	db, err := bolt.Open("storage/tags.db", 0600, nil)
	if err != nil {
		fmt.Printf("Error opening db, %s\n", err)
	}
	defer db.Close()

	tag := strings.Trim(m.Content[11:], " ")
	fmt.Println("Tag:", tag, "|")

	err = db.Update(func(tx *bolt.Tx) error {
		b, uperr := tx.CreateBucketIfNotExists([]byte(channel.GuildID))
		uperr = b.Delete([]byte(tag))
		if uperr != nil {
			fmt.Println("Error in DB:", err)
		}
		return uperr
	})

	if err != nil {
		fmt.Println("Error in DB:", err)
	}

	s.ChannelMessageSend(m.ChannelID, ":white_check_mark:")
}
