import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat.mjs";
import { NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import type { Document } from "@langchain/core/documents";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = "nodejs";

const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HUGGINGFACEHUB_API_KEY,
  model: "BAAI/bge-large-en-v1.5",
  provider: "hf-inference",
});

const supabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PRIVATE_KEY!,
);

const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseClient,
  tableName: "documents",
  queryName: "match_documents",
});

export async function POST(request: Request) {
  const { query, messages } = await request.json();

  // await indexTheDocument(
  //   "/Users/parshurambagade/Desktop/Developer/projects/gen-ai/mini-gpt/cg-internal-docs.pdf",
  // );

  console.log("Message received by server: ", query);

  if (!query || !query.trim().length || !messages)
    return NextResponse.json(
      { error: "Message and messages can't be empty!" },
      { status: 400 },
    );

  const similaritySearchResults = await vectorStore.similaritySearch(query);

  const context = similaritySearchResults
    .map((doc) => doc.pageContent)
    .join("\n\n");

  console.log("Context: ", context);

  // const SYSTEM_PROMPT = `${process.env.SYSTEM_PROMPT} ${new Date().toUTCString()}`;

  const SYSTEM_PROMPT = `You are a smart AI assistent, your task is to answer user queries according to the provided context. If you dont know the answer, be honest and tell the user that you could not find information related to that query. Answer shortly.`;

  const queryWithContext = `CONTEXT: ${context} \n\n QUERY: ${query} \n\n ANSWER:`;

  const localMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    ...messages,
    {
      role: "user",
      // content: query,
      content: queryWithContext,
    },
  ];

  const MAX_RETRIES = 5;
  let retries = 0;

  while (true) {
    if (retries >= MAX_RETRIES) {
      return Response.json({
        message:
          "I could not find the information you are looking for, please try again later!",
      });
    }

    const chatCompletion = await getGroqChatCompletion(
      localMessages as ChatCompletionMessageParam[],
    );

    localMessages.push(chatCompletion.choices[0]?.message);

    const toolCalls = chatCompletion.choices[0]?.message?.tool_calls;

    if (!toolCalls) {
      return Response.json({
        message: chatCompletion.choices[0]?.message?.content || "",
      });
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
        localMessages.push(message as ChatCompletionMessageParam);
      }
    }

    retries++;
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
    model: "openai/gpt-oss-20b",
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

export async function indexTheDocument(docPath: string) {
  // load the document
  const loader = new PDFLoader(docPath, {
    splitPages: false,
  });

  const singleDoc = await loader.load();

  console.log(singleDoc);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  });
  const texts = await splitter.splitText(singleDoc[0].pageContent);

  // console.log("Texts: ", texts);

  // agian convert items in texts array in this format {pageContent: string, metadata: {}}
  const documents: Document[] = [];

  texts.forEach((text) => {
    documents.push({
      pageContent: text,
      metadata: singleDoc[0].metadata,
    });
  });

  console.log("docs: ", documents);
  try {
    console.log("Supabase client: ", supabaseClient);
    console.log("Vector Store: ", vectorStore);

    await vectorStore.addDocuments(documents);
  } catch (error) {
    console.log("ERROR ADDING DOCS: ", error);
  }
}
