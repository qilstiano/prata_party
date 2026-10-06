package main

import "time"

type Message struct {
	Text     string    `json:"text"` //cool, didn't know we could do this
	Sender   string    `json:"sender"`
	TimeSent time.Time `json:"timeSent"`
}
