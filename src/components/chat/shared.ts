/** user = visitor, assistant = the AI, agent = a member of staff who took over the chat. */
export type ChatMessage = { id: string; role: "user" | "assistant" | "agent"; content: string; saved?: boolean; serverId?: number };

export const ASSISTANT_NAME = "Regal Concierge";

/** sessionStorage key: the conversation survives page loads within the tab, nothing more. */
export const CHAT_STORAGE_KEY = "rvl-chat";
export const TEASER_KEY = "rvl-chat-teaser";

export const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "Hello, welcome to **Regal Victoria Lakeside**. I can tell you about the villas, the amenities and the area, or arrange a site visit in Digana. How can I help?",
};

export const QUICK_PROMPTS = [
  "Which villas are available?",
  "I'd like to book a site visit",
  "What amenities are there?",
  "Where is it located?",
];
