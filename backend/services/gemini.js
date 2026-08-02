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

const SYSTEM_PROMPT = `You extract actionable tasks and meetings from emails. A task is
anything that implies the recipient needs to do something — a request, a
deadline, a commitment, or a follow-up ask. A meeting is a specific type of
task: it must both (a) have an actual clock time (not just a date) and
(b) involve meeting, calling, or syncing with someone. If either is
missing — no clock time, or no meeting/call intent — classify it as a task,
not a meeting. Ignore newsletters, notifications, and purely informational
emails.

Resolve relative dates AND times (e.g. "by Friday", "end of week", "3pm",
"10:30 in the morning") against the email's actual received date, not
today's date. If a clock time is present, include it in the deadline as a
full ISO datetime, not just a date.

Return ONLY valid JSON, no preamble, no markdown formatting:
{
  "has_task": boolean,
  "tasks": [
    {
      "task": "short actionable phrase",
      "type": "task | meeting",
      "deadline": "ISO date or ISO datetime or null",
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

/** An ISO date-only string ("2026-08-10") is 10 characters; anything with a
 * time component (e.g. "2026-08-10T15:00:00.000Z") is longer. */
function hasTimeComponent(deadline) {
  return typeof deadline === 'string' && deadline.length > 10;
}

/** Re-validates the model's "meeting" classification server-side: a meeting
 * must have a time-bearing deadline, or it's downgraded to a task. Never
 * trust the model alone to have followed the classification rule. */
export function normalizeExtractedTasks(tasks) {
  return tasks.map((t) => ({
    ...t,
    type: t.type === 'meeting' && hasTimeComponent(t.deadline) ? 'meeting' : 'task',
  }));
}

/** Parses and validates a raw Gemini response into { has_task, tasks }.
 * Returns { has_task: false, tasks: [] } for anything that doesn't parse or
 * doesn't match the expected shape — pure and testable without an API call. */
export function parseExtractionResponse(text) {
  if (!text) return { has_task: false, tasks: [] };
  try {
    const parsed = JSON.parse(stripCodeFences(text));
    if (typeof parsed.has_task !== 'boolean' || !Array.isArray(parsed.tasks)) {
      return { has_task: false, tasks: [] };
    }
    return { has_task: parsed.has_task, tasks: normalizeExtractedTasks(parsed.tasks) };
  } catch (err) {
    console.warn('[gemini] failed to parse extraction response as JSON:', err.message);
    return { has_task: false, tasks: [] };
  }
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
  return parseExtractionResponse(result.response.text());
}
