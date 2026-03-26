# 🚀 MiniGPT — Tool-Calling Chat with Groq + Tavily

---

## 📌 Overview

**MiniGPT** is a small Next.js chat app built to answer questions using a real web-search tool when the model needs updated information. The backend exposes a single `POST /api/chat` endpoint that takes the user's latest query plus the current conversation history, asks an LLM for an answer, and automatically invokes a `webSearch` tool when the model requests it.

This solves a common real-world limitation in assistants: without a retrieval/search step, the model may miss "today/this week" details. Here, the server integrates Tavily search results into the model's context via tool-calling, producing **grounded responses** instead of pretending to "know" everything.

Unlike many demos, the project is intentionally implemented with **explicit tool-calling state management**: the server runs a bounded tool-resolution loop, and the client remains simple by keeping conversation messages on the frontend.

---

## ✨ Key Features

- Server-side tool calling using Groq function/tool schema (`webSearch`) with `tool_choice: "auto"`
- Bounded multi-turn tool resolution loop (`MAX_RETRIES = 5`) inside a single API request
- Tavily-backed `webSearch` tool that flattens results into a single context string (`results[].content.join("\n\n")`)
- Client-managed chat history: the browser owns the `messages` array and sends it on every request
- Explicit system prompt injection per request, augmented with the current UTC timestamp

---

## 🧠 How It Works (Architecture)

```
User → API → LLM → Tool → Response
```

1. **User (frontend)** submits a query in `app/page.tsx`. The client appends `{ role: "user", content: query }` to its local `messages` state and `POST`s to `/api/chat` with:
   - `query`: the latest user text
   - `messages`: the conversation history the UI has tracked so far

2. **API route (backend)** lives in `app/api/chat/route.ts`.
   - It builds `localMessages` by combining:
     - A system message from `process.env.SYSTEM_PROMPT` plus `new Date().toUTCString()`
     - The client-provided `messages`
     - A new user message for the current query
   - It calls Groq via `getGroqChatCompletion(localMessages)` using:
     - `tools: [{ type: "function", function: { name: "webSearch", ...JSON schema... } }]`
     - `tool_choice: "auto"`
     - `model: "openai/gpt-oss-20b"`

3. **LLM (Groq)** may return either:
   - A final assistant message (`tool_calls` absent) → the route returns `{ message: assistant_content }` as JSON
   - One or more tool calls (`tool_calls` present) → the route enters a loop

4. **Tool calling (server tool execution):**
   - For each tool call, the route:
     - Reads `tool.function.name` (expects `webSearch`)
     - Parses `tool.function.arguments` with `JSON.parse`
     - Executes `webSearch({ query })` using Tavily (`tvly.search(query)`)
     - Appends a `role: "tool"` message back into `localMessages` with `tool_call_id` and `name`
   - It then calls the LLM again with the updated `localMessages`

5. **State handling:**
   - Frontend state is the source of truth for chat history (`messages`)
   - Backend state (`localMessages`) is a request-scoped working memory that includes system + client history + the current user message, plus any intermediate tool messages used for reasoning
   - No streaming is implemented: the client waits for a single JSON response after tool resolution completes

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js App Router (React 19), Tailwind CSS v4, shadcn UI, Radix UI |
| **Backend/API** | Next.js route handler `app/api/chat/route.ts` |
| **AI/LLM** | `groq-sdk` chat completions with tool/function schema, model `openai/gpt-oss-20b` |
| **Tools** | `@tavily/core` for `webSearch` (internet lookup) |

---

## 📂 Project Structure

```
app/
├── page.tsx                   # Client-side chat UI and request/response handling
└── api/
    └── chat/
        └── route.ts           # Core orchestration logic (LLM call + tool execution loop)

components/ui/
├── message.tsx                # Role-aware message rendering
├── prompt-box.tsx             # Textarea input and send behavior
└── button.tsx                 # shadcn/Radix-based button styling utility

lib/
└── utils.ts                   # cn() helper for class name composition

types/
└── index.ts                   # Shared IMessage shape (role, content)
```

---

## ⚡ Challenges & Learnings

- **Tool dispatch is hard-coded** to a single tool name (`webSearch`). Extending to multiple tools would require a proper tool router/dispatch layer.
- **Dynamic system prompt** construction on every request (`SYSTEM_PROMPT` + UTC timestamp) makes answers time-aware, but the prompt payload grows and must remain consistent with tool schema expectations.
- **Optimistic tool argument handling**: `JSON.parse(tool.function.arguments)` and `webSearch(functionParams || "")` assume the model produces valid JSON matching `{ query: string }`. Invalid arguments could throw without a defensive fallback.
- **Inconsistent UI error path**: on non-OK responses, the client sets an error message but still proceeds to parse and use `data.message`, which can lead to an `undefined` assistant message when the server returns `{ error: ... }` with a `400`.
- **No streaming**: user experience is simpler, but latency is fully bound to `LLM + tool(s) + final LLM` round-trips inside one request.

---

## 🧪 Possible Improvements

- **Add real streaming** (SSE/`ReadableStream`) so users see partial output while the LLM is generating and while tool calls are being resolved.
- **Harden tool calling:**
  - Validate tool arguments before destructuring
  - Wrap `JSON.parse` in `try/catch` and return a controlled error
  - Implement a general tool dispatcher (support multiple `tool.function.name` values)
- **Fix frontend error handling** to return early on non-OK responses (avoid reading `data.message` when the server responds with `error`).
- **Add request cancellation and timeouts** (e.g., `AbortController`) to prevent "stuck" UI when Tavily or Groq is slow.
- **Improve prompt UX:**
  - Treat `Enter` as send only when appropriate (e.g., `Shift+Enter` for newlines)
  - Disable the send action while `isLoading` is `true`

---

## 🧑‍💻 Author

**Parshurambagade**
