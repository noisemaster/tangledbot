package boxbot

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"strings"

	"github.com/bwmarrin/discordgo"
)

//TumblrTag stuct contains info about a tumblr tag
type TumblrTag struct {
	Response []struct {
		PostURL string `json:"post_url"`
	} `json:"response"`
}

//SendTumblrPost sends a random post from a tag
func SendTumblrPost(s *discordgo.Session, m *discordgo.MessageCreate, key string) {
	if len(m.Content) < 9 {
		return
	}
	tag := m.Content[9:]
	r := strings.NewReplacer(" ", "%20")
	var info TumblrTag
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://api.tumblr.com/v2/tagged?tag="+r.Replace(tag)+"&api_key="+key, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	req.Header.Set("User-Agent", "Boxbot/0.2")
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
	json.Unmarshal(body, &info)
	s.ChannelMessageSend(m.ChannelID, info.Response[rand.Intn(len(info.Response))].PostURL)
}
