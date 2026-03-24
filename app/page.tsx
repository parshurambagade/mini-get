"use client";

import { useState } from "react";
import Message from "../components/ui/message";
import PromptBox from "../components/ui/prompt-box";

export default function Home() {
  const [messages, setMessages] = useState([{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello there, how can I assist you today?" }]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (query.trim() === "") return;
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: query }])
    setQuery("")
    try {

      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        let errorMsg = "Error generating response, please try again later!";

        try {
          const err = await response.json();
          errorMsg = err.error || errorMsg;
        } catch {

        }

        setMessages(prev => [...prev, {
          role: "assistant",
          content: errorMsg

        }])
      }

      const data = await response.json();

      const msg = {
        role: "assistant",
        content: data.message
      }

      setMessages(prev => [...prev, msg]);
    } catch (error) {
      console.error("Error sending message: ", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Error sending message, please try again later!"
      }])
    } finally {
      setIsLoading(false);
    }

  }

  return (
    <main>
      <section id="main-container" className="container mx-auto max-w-3xl px-2 py-4">
        <section id="chat-list" className="pb-32">
          {messages.length && messages.map((msg, idx) => <Message key={idx} content={msg.content} role={msg.role} />)}
          {isLoading && <Message content="Thinking..." role="assistant" className="animate-pulse" />}
        </section>
        <section id="prompt-box" className=" fixed bottom-0 w-full inset-x-0 flex justify-center pb-3 bg-neutral-900">
          <PromptBox handleSend={handleSend} query={query} setQuery={setQuery} />
        </section>
      </section>
    </main>
  );
}
