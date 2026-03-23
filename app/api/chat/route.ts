import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat.mjs";
import { NextResponse } from "next/server";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  const { message } = await request.json();

  console.log("Message received by server: ", message);

  if (!message || !message.trim().length)
    return NextResponse.json(
      { error: "Message can't be empty!" },
      { status: 400 },
    );

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a smart ai assistent. Your task is to answer the querries that are asked. You have access to follwing tools: 
                1. webSearch({query}: {query: string}) // gets latest and realtime data from the internet`,
    },
    {
      role: "user",
      content: message,
      // content: "who was the first president of india?",
    },
  ];

  while (true) {
    const chatCompletion = await getGroqChatCompletion(
      messages as ChatCompletionMessageParam[],
    );

    messages.push(chatCompletion.choices[0]?.message);

    const toolCalls = chatCompletion.choices[0]?.message?.tool_calls;

    if (!toolCalls) {
      return Response.json(chatCompletion.choices[0]?.message?.content || "");
    }

    // if tool calls are there, then call tools
    for (const tool of toolCalls) {
      const functionName = tool.function.name;
      const functionParams = JSON.parse(tool.function.arguments);

      if (functionName === "webSearch") {
        const result = await webSearch(functionParams || "");
        const message = {
          role: "tool",
          content: result,
          tool_call_id: tool.id,
          name: functionName,
        };
        messages.push(message as ChatCompletionMessageParam);
      }
    }
    // Print the completion returned by the LLM.
    //   console.log(JSON.stringify(chatCompletion.choices[0]?.message) || "");
  }
}

export async function getGroqChatCompletion(
  messages: ChatCompletionMessageParam[],
) {
  return groq.chat.completions.create({
    messages: messages,
    tools: [
      {
        type: "function",
        function: {
          name: "webSearch",
          description: "Get latest and realtime data from the internet",
          parameters: {
            // JSON Schema object
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query to perform internet search on.",
              },
            },
            required: ["query"],
          },
        },
      },
    ],
    tool_choice: "auto",
    model: "llama-3.1-8b-instant",
  });
}

async function webSearch({ query }: { query: string }) {
  console.log("Calling web search tool...");
  const response = await tvly.search(query);
  const finalContent = response?.results
    ?.map((result) => result.content)
    .join("\n\n");

  return finalContent || "";
}
