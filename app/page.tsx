"use client";

import { useState } from "react";
import Message from "../components/ui/message";
import PromptBox from "../components/ui/prompt-box";

export default function Home() {
  const [messages, setMessages] = useState([{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello there, how can I assist you today?" }]);
  const [query, setQuery] = useState("");

  return (
    <main>
      <section id="main-container" className="container mx-auto max-w-3xl px-2 py-4">
        <section id="chat-list" className="pb-32">
          {messages.length && messages.map((msg, idx) => <Message key={idx} content={msg.content} role={msg.role} />)}
        </section>
        <section id="prompt-box" className=" fixed bottom-0 w-full inset-x-0 flex justify-center pb-3 bg-neutral-900">
          <PromptBox setMessages={setMessages} query={query} setQuery={setQuery} />
        </section>
      </section>
    </main>
  );
}
