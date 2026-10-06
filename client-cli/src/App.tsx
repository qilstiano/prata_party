import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import WebSocket from "ws";

// ── Types ──────────────────────────────────────────────────
interface ChatMessage {
  text: string;
  sender: string;
  timeSent?: string;
}

// ── Colours ────────────────────────────────────────────────
const BLUE = "#0055ff";
const DIM = "#555555";
const CYAN = "#00ccff";
const WHITE = "#e0e0e0";

// ── Username prompt ────────────────────────────────────────
function UsernamePrompt({
  onSubmit,
}: {
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text color={DIM}>{">"} </Text>
        <Text color={WHITE}>CONNECTION ESTABLISHED</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={DIM}>{">"} </Text>
        <Text color={WHITE}>AWAITING IDENTIFICATION...</Text>
      </Box>
      <Box>
        <Text color={CYAN} bold>
          {"@ "}
        </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={(v) => {
            const trimmed = v.trim();
            if (trimmed.length > 0) onSubmit(trimmed);
          }}
          placeholder="pick a username"
        />
      </Box>
    </Box>
  );
}

// ── Single message bubble ──────────────────────────────────
function MessageBubble({
  msg,
  isMe,
}: {
  msg: ChatMessage;
  isMe: boolean;
}) {
  const time = msg.timeSent
    ? new Date(msg.timeSent).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (isMe) {
    return (
      <Box flexDirection="column" alignItems="flex-end" marginBottom={1}>
        <Box>
          <Text backgroundColor={BLUE} color="white">
            {" "}
            {msg.text}{" "}
          </Text>
        </Box>
        {time ? (
          <Text color={DIM} dimColor>
            {time}
          </Text>
        ) : null}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="flex-start" marginBottom={1}>
      <Text color={CYAN} bold>
        @{msg.sender}
      </Text>
      <Box>
        <Text backgroundColor="#1a1a2e" color={WHITE}>
          {" "}
          {msg.text}{" "}
        </Text>
      </Box>
      {time ? (
        <Text color={DIM} dimColor>
          {time}
        </Text>
      ) : null}
    </Box>
  );
}

// ── Chat screen ────────────────────────────────────────────
function ChatScreen({
  username,
  ws,
}: {
  username: string;
  ws: WebSocket;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const { exit } = useApp();

  useEffect(() => {
    const handler = (data: WebSocket.RawData) => {
      try {
        const msg: ChatMessage = JSON.parse(data.toString());
        setMessages((prev) => [...prev, msg]);
      } catch {
        // ignore non-JSON
      }
    };

    ws.on("message", handler);
    return () => {
      ws.off("message", handler);
    };
  }, [ws]);

  useInput((ch, key) => {
    if (key.ctrl && ch === "c") {
      ws.close();
      exit();
    }
  });

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;

    const msg: ChatMessage = {
      text: trimmed,
      sender: username,
      timeSent: new Date().toISOString(),
    };

    ws.send(JSON.stringify(msg));
    setInput("");
  };

  return (
    <Box flexDirection="column" padding={1} height="100%">
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={CYAN} bold>
          {">"} prata_party
        </Text>
        <Text color={DIM}> — logged in as </Text>
        <Text color={CYAN} bold>
          @{username}
        </Text>
      </Box>

      <Box
        borderStyle="single"
        borderColor={DIM}
        flexDirection="column"
        flexGrow={1}
        paddingX={1}
      >
        {messages.length === 0 ? (
          <Text color={DIM}>no messages yet. say something.</Text>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              isMe={msg.sender === username}
            />
          ))
        )}
      </Box>

      {/* Input bar */}
      <Box marginTop={1}>
        <Text color={BLUE} bold>
          {"› "}
        </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="type a message..."
        />
      </Box>

      <Box marginTop={1}>
        <Text color={DIM} dimColor>
          ctrl+c to exit
        </Text>
      </Box>
    </Box>
  );
}

// ── Main app ───────────────────────────────────────────────
const WS_URL = process.env["WS_URL"] || "ws://localhost:2002/ws";

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<
    "prompt" | "connecting" | "connected" | "error"
  >("prompt");
  const [errorMsg, setErrorMsg] = useState("");
  const { exit } = useApp();

  const handleUsername = (name: string) => {
    setStatus("connecting");

    const socket = new WebSocket(WS_URL);

    socket.on("open", () => {
      setUsername(name);
      setWs(socket);
      setStatus("connected");
    });

    socket.on("error", (err) => {
      setErrorMsg(
        `Could not connect to ${WS_URL}. Is the Go server running?\n${err.message}`
      );
      setStatus("error");
    });

    socket.on("close", () => {
      setErrorMsg("Connection closed.");
      setStatus("error");
    });
  };

  useInput((ch, key) => {
    if (key.ctrl && ch === "c") {
      ws?.close();
      exit();
    }
  });

  if (status === "prompt") {
    return <UsernamePrompt onSubmit={handleUsername} />;
  }

  if (status === "connecting") {
    return (
      <Box padding={1}>
        <Text color={DIM}>{">"} connecting to {WS_URL}...</Text>
      </Box>
    );
  }

  if (status === "error") {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="red">✗ {errorMsg}</Text>
        <Text color={DIM} dimColor>
          ctrl+c to exit
        </Text>
      </Box>
    );
  }

  return <ChatScreen username={username!} ws={ws!} />;
}
