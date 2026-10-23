/**
 * gemini.js – Gemini 1.5 Flash chat service for the Checker event planner.
 *
 * Exposes a single factory function `createGeminiChat` that returns a stateful
 * chat session pre-loaded with an event-planning system prompt.
 * Falls back gracefully to the local rule-based engine if the API key is absent
 * or the network call fails.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { formatCurrency, generateAIResponse } from "./utils.js";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Build the system instruction that grounds Gemini in the user's event context.
 *
 * @param {object} context
 * @param {object} context.event
 * @param {Array}  context.tasks
 * @param {Array}  context.expenses
 * @param {Array}  context.vendors
 * @returns {string}
 */
function buildSystemPrompt({ event, tasks, expenses, vendors }) {
  const spent = expenses.reduce((s, x) => s + (x.amount ?? 0), 0);
  const paid = expenses
    .filter((x) => x.status === "Paid")
    .reduce((s, x) => s + (x.amount ?? 0), 0);
  const openTasks = tasks.filter((t) => !t.done);
  const bookedVendors = vendors.filter((v) => v.status === "Booked");

  return `You are Checker AI, a warm, encouraging, and highly knowledgeable event planning assistant.
You specialise in weddings, birthday parties, and community events.
Be concise (2–4 sentences max per response), friendly, and always actionable.
Use occasional relevant emojis to stay approachable.
Never fabricate vendor names, prices, or dates that aren't in the context.

== CURRENT EVENT CONTEXT ==
Event name  : ${event.name}
Event type  : ${event.type}
Event date  : ${event.date}
Guest count : ${event.guests}
Total budget: ${formatCurrency(event.budget)}
Spent so far: ${formatCurrency(spent)} (${formatCurrency(paid)} paid, ${formatCurrency(spent - paid)} planned)
Remaining   : ${formatCurrency(event.budget - spent)}

== OPEN TASKS (${openTasks.length}) ==
${openTasks.slice(0, 8).map((t) => `• [${t.priority}] ${t.text} (${t.group})`).join("\n") || "None — all tasks complete!"}

== VENDORS (${vendors.length} total, ${bookedVendors.length} booked) ==
${vendors.map((v) => `• ${v.name} — ${v.type} — ${v.status}`).join("\n") || "No vendors added yet."}

When the user asks about budgets, tasks, vendors, ideas, or timelines,
always reference this specific context to give personalised advice.`;
}

/**
 * Create a stateful Gemini chat session for the given planning context.
 *
 * @param {object} context - { event, tasks, expenses, vendors }
 * @returns {{ sendMessage: (text: string) => Promise<string>, isReal: boolean }}
 */
export function createGeminiChat(context) {
  // If no API key, use the local fallback engine
  if (!API_KEY) {
    return {
      isReal: false,
      sendMessage: async (text) => generateAIResponse(text, context),
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: buildSystemPrompt(context),
    });

    const chat = model.startChat({
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    return {
      isReal: true,
      /**
       * Send a message and receive the AI's text reply.
       * Falls back to local engine on network/API errors.
       * @param {string} text
       * @returns {Promise<string>}
       */
      sendMessage: async (text) => {
        try {
          const result = await chat.sendMessage(text);
          return result.response.text();
        } catch (err) {
          console.error("[Checker AI] Gemini API error:", err?.message ?? err);
          // Graceful fallback — user never sees a crash
          return generateAIResponse(text, context);
        }
      },
    };
  } catch (err) {
    console.error("[Checker AI] Failed to initialise Gemini:", err?.message ?? err);
    return {
      isReal: false,
      sendMessage: async (text) => generateAIResponse(text, context),
    };
  }
}
