package main

import (
	"net/http"

	"github.com/gorilla/websocket"

	"log"
)

const port = ":2002"

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func serveWebsocket(hub *Hub, writer http.ResponseWriter, request *http.Request) {
	conn, err := upgrader.Upgrade(writer, request, nil)

	if err != nil {
		log.Println(err)
		return
	}

	client := &Client{
		hub:  hub,
		conn: conn,
		send: make(chan Message),
	}

	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func main() {
	hub := newHub()
	go hub.Run()

	http.HandleFunc("/ws", func(writer http.ResponseWriter, request *http.Request) {
		serveWebsocket(hub, writer, request)
	})

	log.Println("listening on", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
