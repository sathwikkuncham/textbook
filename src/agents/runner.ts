import { InMemoryRunner, stringifyContent, isFinalResponse } from "@google/adk";
import type { BaseAgent } from "@google/adk";
import type { Content } from "@google/genai";

export async function runAgent(
  agent: BaseAgent,
  message: string
): Promise<string> {
  const runner = new InMemoryRunner({ agent, appName: "textbook" });

  const userMessage: Content = {
    role: "user",
    parts: [{ text: message }],
  };

  let result = "";

  for await (const event of runner.runEphemeral({
    userId: "learner",
    newMessage: userMessage,
  })) {
    if (isFinalResponse(event)) {
      const text = stringifyContent(event);
      if (text) {
        result += text;
      }
    }
  }

  return result;
}

export async function* streamAgent(
  agent: BaseAgent,
  message: string
): AsyncGenerator<string> {
  const runner = new InMemoryRunner({ agent, appName: "textbook" });

  const userMessage: Content = {
    role: "user",
    parts: [{ text: message }],
  };

  for await (const event of runner.runEphemeral({
    userId: "learner",
    newMessage: userMessage,
  })) {
    const text = stringifyContent(event);
    if (text) {
      yield text;
    }
  }
}

/**
 * Stream agent text for SSE responses.
 * Yields text chunks suitable for Server-Sent Events.
 * Filters to only content events (skips tool calls).
 */
export async function* streamAgentText(
  agent: BaseAgent,
  message: string
): AsyncGenerator<string> {
  const runner = new InMemoryRunner({ agent, appName: "textbook" });

  const userMessage: Content = {
    role: "user",
    parts: [{ text: message }],
  };

  for await (const event of runner.runEphemeral({
    userId: "learner",
    newMessage: userMessage,
  })) {
    // Only yield text from the agent (not tool call events)
    if (event.author === agent.name || isFinalResponse(event)) {
      const text = stringifyContent(event);
      if (text) {
        yield text;
      }
    }
  }
}
