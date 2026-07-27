import Anthropic from '@anthropic-ai/sdk';

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set — cannot run task extraction.');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
 * Sends an email's subject/sender/body to Claude Haiku for structured task
 * extraction. Returns { has_task, tasks: [...] } or { has_task: false, tasks: [] }
 * if the response can't be parsed as valid JSON.
 */
export async function extractTasks({ subject, sender, receivedDate, body }) {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildUserMessage({ subject, sender, receivedDate, body }),
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) return { has_task: false, tasks: [] };

  try {
    const parsed = JSON.parse(stripCodeFences(textBlock.text));
    if (typeof parsed.has_task !== 'boolean' || !Array.isArray(parsed.tasks)) {
      return { has_task: false, tasks: [] };
    }
    return parsed;
  } catch (err) {
    console.warn('[claude] failed to parse extraction response as JSON:', err.message);
    return { has_task: false, tasks: [] };
  }
}
