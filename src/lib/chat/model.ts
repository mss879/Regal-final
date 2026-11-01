// gpt-6-luna: OpenAI's most efficient model for focused, high-volume tasks ($0.10 / $0.50 per 1M
// tokens in / out — cheaper than gpt-4o-mini). Override with OPENAI_MODEL.
export const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-6-luna";

// Reasoning models take a reasoning effort instead of a temperature. "none" keeps replies fast,
// and gpt-6-luna only supports tool calling on Chat Completions with reasoning set to "none".
export function modelSettings(model: string) {
  if (!/^(gpt-([5-9]|\d{2})|o\d)/.test(model)) return { temperature: 0.4 };
  const effort = /^gpt-5(-|$)/.test(model) ? "minimal" : /^o\d/.test(model) || (/^gpt-6/.test(model) && !/^gpt-6-(luna|sol)$/.test(model)) ? "low" : "none";
  return { providerOptions: { openai: { reasoningEffort: effort } } };
}
