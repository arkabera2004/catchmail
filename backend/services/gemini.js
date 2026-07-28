import { GoogleGenerativeAI } from '@google/generative-ai';

let client;
function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set — cannot run task extraction.');
    }
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

const SYSTEM_PROMPT = `You extract actionable tasks from emails. A task is anything that
implies the recipient needs to do something — a request, a deadline,
a commitment, or a follow-up ask. Ignore newsletters, notifications,
and purely informational emails.

Resolve relative dates (e.g. "by Friday", "end of week") against the
email's actual received date, not today's date.

Return ONLY valid JSON, no preamble, no markdown formatting:
{
  "has_task": boolean,
  "tasks": [
    {
      "task": "short actionable phrase",
      "deadline": "ISO date or null",
      "confidence": "high | medium | low",
      "reason": "short quote or paraphrase of the triggering line"
    }
  ]
}`;

function buildUserMessage({ subject, sender, receivedDate, body }) {
  return `Email:
Subject: ${subject}
From: ${sender}
Received: ${receivedDate}
Body: ${body}`;
}

function stripCodeFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

/**
 * Sends an email's subject/sender/body to Gemini for structured task
 * extraction. Returns { has_task, tasks: [...] } or { has_task: false, tasks: [] }
 * if the response can't be parsed as valid JSON.
 */
export async function extractTasks({ subject, sender, receivedDate, body }) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(buildUserMessage({ subject, sender, receivedDate, body }));
  const text = result.response.text();
  if (!text) return { has_task: false, tasks: [] };

  try {
    const parsed = JSON.parse(stripCodeFences(text));
    if (typeof parsed.has_task !== 'boolean' || !Array.isArray(parsed.tasks)) {
      return { has_task: false, tasks: [] };
    }
    return parsed;
  } catch (err) {
    console.warn('[gemini] failed to parse extraction response as JSON:', err.message);
    return { has_task: false, tasks: [] };
  }
}
