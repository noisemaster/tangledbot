package boxbot

import (
	"bufio"
	"fmt"
	"math/rand"
	"os"
	"sort"
	"strings"

	"github.com/bwmarrin/discordgo"
	"github.com/noisemaster/frinkiacapigo"
	"github.com/noisemaster/godogceo"
)

var robotLines []string

func init() {
	var err error
	robotLines, err = readLines("storage/LeadRobot.txt")
	if err != nil {
		fmt.Println("LeadRobot.txt not found, that's ok")
	}
}

func readLines(path string) ([]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return []string{"LeadRobot.txt not found"}, err
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	return lines, scanner.Err()
}

//SendRobotQuote sends a quote from list of quotes "storage/LeadRobot.txt"
func SendRobotQuote(s *discordgo.Session, m *discordgo.MessageCreate) {
	s.ChannelMessageSend(m.ChannelID, "`"+robotLines[rand.Intn(len(robotLines))]+"`")
}

//HandleFrinkiac sends images from Simpsons quote search engine Frinkiac
func HandleFrinkiac(s *discordgo.Session, m *discordgo.MessageCreate) {
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

//HandleMorbotron sends images from Futurama quote search engine Morbotron
func HandleMorbotron(s *discordgo.Session, m *discordgo.MessageCreate) {
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

//HandleChoices sends a item from a list of items
func HandleChoices(s *discordgo.Session, m *discordgo.MessageCreate) {
	if len(m.Content) < 9 {
		return
	}
	choices := strings.Split(m.Content[9:], "or")
	s.ChannelMessageSend(m.ChannelID, "I choose **"+strings.Trim(choices[rand.Intn(len(choices))], " ")+"**")
}

func convertToFullWidth(s string) string {
	var conv []rune
	for _, v := range s {
		if v == ' ' {
			conv = append(conv, rune(v), rune(v))
		} else {
			conv = append(conv, rune(v)+65248)
		}
	}
	return string(conv)
}

//SendFullWidth sends a message back using full width unicode
func SendFullWidth(s *discordgo.Session, m *discordgo.MessageCreate) {
	if len(m.Content) > 11 {
		s.ChannelMessageSend(m.ChannelID, convertToFullWidth(m.Content[12:]))
	}
}

//SendRandomDog sends a random dog image from dog.ceo
func SendRandomDog(s *discordgo.Session, m *discordgo.MessageCreate) {
	image, err := godogceo.GetRandomImage()
	if err != nil {
		fmt.Println(err)
	}
	s.ChannelMessageSend(m.ChannelID, image)
	SendBreedList(s, m)
}

// SendBreedList sends a list of dog breeds and subbreeds as an embed as a
// private message
func SendBreedList(s *discordgo.Session, m *discordgo.MessageCreate) {
	list, err := godogceo.GetDogBreeds()
	var breeds []string
	if err != nil {
		fmt.Println(err)
	}
	for breed := range list.Message {
		breeds = append(breeds, breed)
	}
	e := discordgo.MessageEmbed{
		URL:   "https://dog.ceo",
		Title: "All Dog Breeds & Subbreeds",
		Color: 0xE5343A,
	}
	// Makes sure that the breeds are being sent in alphabetical order
	sort.Strings(breeds)
	for _, breed := range breeds {
		e.Description += "**" + breed + "**\n"
		if len(list.Message[breed]) > 0 {
			for i := 0; i < len(list.Message[breed]); i++ {
				e.Description += "\t" + list.Message[breed][i] + "\n"
			}
		}
	}
	pm, err := s.UserChannelCreate(m.Author.ID)
	if err != nil {
		fmt.Println(err)
	}
	_, err = s.ChannelMessageSendEmbed(pm.ID, &e)
	if err != nil {
		fmt.Println(err)
	}
	s.ChannelMessageSend(m.ChannelID, ":incoming_envelope:")
}
