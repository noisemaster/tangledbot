package boxbot

import (
	"bufio"
	"bytes"
	"image/png"
	"log"

	"github.com/bwmarrin/discordgo"
	"github.com/fogleman/gg"
)

// SendIsThisImage loads an image and sends it to the user
func SendIsThisImage(s *discordgo.Session, m *discordgo.MessageCreate) {
	image, err := gg.LoadImage("storage/IsThis.png")
	if err != nil {
		log.Println(err)
		return
	}
	ix := image.Bounds().Dx()
	iy := image.Bounds().Dy()
	dc := gg.NewContext(ix, iy)
	dc.DrawImage(image, 0, 0)

	dc.SetRGB(.082, .082, .082)
	if err = dc.LoadFontFace("storage/WorkSans-Regular.ttf", 44); err != nil {
		log.Println(err)
		return
	}

	// Write string
	memeText, _ := m.ContentWithMoreMentionsReplaced(s)
	memeText = memeText[8:]
	stroke := 5
	for dy := -stroke; dy <= stroke; dy++ {
		for dx := -stroke; dx <= stroke; dx++ {
			if dx*dx+dy*dy >= stroke*stroke {
				continue
			}
			x := 355 + float64(dx)
			y := 698 + float64(dy)
			dc.DrawStringAnchored(memeText, x, y, 0, 0.5)
		}
	} //390, 702

	dc.SetRGB(1, 1, 1)
	dc.DrawStringAnchored(memeText, 355, 698, 0, 0.5)

	b := bytes.Buffer{}
	err = png.Encode(&b, dc.Image())
	if err != nil {
		log.Println(err)
		return
	}

	_, err = s.ChannelFileSend(m.ChannelID, "isthis.png", bufio.NewReader(&b))
	if err != nil {
		log.Println(err)
		return
	}
}
