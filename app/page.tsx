import Message from "./components/message";

export default function Home() {
  return (
    <main>
      <section id="main-container" className="container mx-auto max-w-3xl px-2 py-4">
        <section id="chat-list">
          <Message content="Hi" role="user" />
          <Message content="Hello there, how can I assist you today?" role="assistant" />
          <Message content="how is weather today?" role="user" />
          <Message content="It is good, it feels like 30deg in Palus, Maharashtra." role="assistant" />
        </section>
        <section id="prompt-box" className="border border-white">
          <textarea></textarea>
          <div>
            <button>Send</button>
          </div>
        </section>
      </section>
    </main>
  );
}
