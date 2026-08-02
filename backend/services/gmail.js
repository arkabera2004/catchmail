import { google } from 'googleapis';
import { supabase } from '../db/supabase.js';
import { decrypt } from '../lib/crypto.js';
import { extractTasks } from './gemini.js';
import { sendPushToUser } from './push.js';

const NOREPLY_PATTERNS = [
  /no-?reply/i,
  /do-?not-?reply/i,
  /notifications?@/i,
  /notification@/i,
  /newsletter/i,
  /calendar-notification@google\.com/i,
  /mailer-daemon/i,
  /automated@/i,
];

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function getAuthedGmailClient(user) {
  if (!user.google_refresh_token_enc) {
    throw new Error(`User ${user.id} has no stored Gmail refresh token.`);
  }
  const refreshToken = decrypt(user.google_refresh_token_enc);
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/** Case-insensitive check of whether a "From" header matches any of the
 * user's VIP sender entries (plain substring match — VIP entries are
 * typically full email addresses, but a domain or name fragment also
 * works since From headers include the display name). */
export function matchesVipSender(from, vipSenders) {
  const lowerFrom = from.toLowerCase();
  return (vipSenders || []).some((vip) => lowerFrom.includes(vip.toLowerCase()));
}

function headerValue(headers, name) {
  const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

function decodeBody(payload) {
  function walk(part) {
    if (!part) return '';
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf8');
    }
    if (part.parts) {
      for (const child of part.parts) {
        const text = walk(child);
        if (text) return text;
      }
    }
    return '';
  }
  const text = walk(payload);
  if (text) return text;
  if (payload?.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }
  return '';
}

function hasCalendarPart(payload) {
  function walk(part) {
    if (!part) return false;
    if (part.mimeType === 'text/calendar') return true;
    if (part.parts) return part.parts.some(walk);
    return false;
  }
  return walk(payload);
}

/**
 * Pre-LLM filter to save on Gemini API calls. Skips obvious non-candidates:
 * no-reply/notification senders, newsletters (List-Unsubscribe header), and
 * calendar invites.
 */
export function shouldSkipMessage(message) {
  const payload = message.payload;
  const headers = payload?.headers || [];
  const from = headerValue(headers, 'From');
  const listUnsubscribe = headerValue(headers, 'List-Unsubscribe');
  const precedence = headerValue(headers, 'Precedence');

  if (NOREPLY_PATTERNS.some((re) => re.test(from))) return true;
  if (listUnsubscribe) return true;
  if (/bulk|list/i.test(precedence)) return true;
  if (hasCalendarPart(payload)) return true;

  return false;
}

export function parseMessage(message) {
  const headers = message.payload.headers || [];
  const subject = headerValue(headers, 'Subject');
  const from = headerValue(headers, 'From');
  const dateHeader = headerValue(headers, 'Date');
  const body = decodeBody(message.payload).slice(0, 6000); // cap body size sent to Gemini
  return {
    id: message.id,
    threadId: message.threadId,
    headers,
    payload: message.payload,
    subject,
    from,
    receivedDate: dateHeader ? new Date(dateHeader) : new Date(Number(message.internalDate)),
    body,
  };
}

async function countTasksThisMonth(userId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());
  if (error) throw error;
  return count || 0;
}

const FREE_TIER_MONTHLY_TASK_CAP = 30;

async function processMessage(user, parsed) {
  if (user.plan === 'free') {
    const used = await countTasksThisMonth(user.id);
    if (used >= FREE_TIER_MONTHLY_TASK_CAP) {
      return; // cap hit — message considered processed, extraction skipped
    }
  }

  const result = await extractTasks({
    subject: parsed.subject,
    sender: parsed.from,
    receivedDate: parsed.receivedDate.toISOString(),
    body: parsed.body,
  });

  if (!result?.has_task || !Array.isArray(result.tasks) || result.tasks.length === 0) {
    return;
  }

  const isVip = matchesVipSender(parsed.from, user.vip_senders);

  const rows = result.tasks.map((t) => ({
    user_id: user.id,
    task_text: t.task,
    type: t.type || 'task',
    deadline: t.deadline || null,
    source_email_id: parsed.id,
    source_email_link: `https://mail.google.com/mail/u/0/#inbox/${parsed.threadId}`,
    source_email_subject: parsed.subject,
    source_email_sender: parsed.from,
    confidence: t.confidence,
    status: 'open',
    is_vip: isVip,
  }));

  const { error } = await supabase.from('tasks').upsert(rows, {
    onConflict: 'user_id,source_email_id,task_text',
    ignoreDuplicates: true,
  });
  if (error) throw error;

  // VIP senders bypass the daily digest wait — notify immediately.
  if (isVip) {
    try {
      await sendPushToUser(user.id, {
        title: 'New task from a VIP sender',
        body: `${parsed.from}: ${result.tasks[0].task}`,
      });
    } catch (err) {
      console.error(`[gmail] VIP push notification failed for user ${user.id}:`, err.message);
    }
  }
}

async function fetchAndProcess(gmail, user, messageId) {
  try {
    const { data: message } = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    if (shouldSkipMessage(message)) return;
    const parsed = parseMessage(message);
    await processMessage(user, parsed);
  } catch (err) {
    // One bad/unprocessable message shouldn't abort the whole backfill/sync batch.
    console.error(`[gmail] failed to process message ${messageId} for user ${user.id}:`, err.message);
  }
}

export async function backfillLast7Days(user) {
  const gmail = await getAuthedGmailClient(user);

  const { data: profile } = await gmail.users.getProfile({ userId: 'me' });

  const { data: list } = await gmail.users.messages.list({
    userId: 'me',
    q: 'newer_than:7d',
    maxResults: 100,
  });

  for (const m of list.messages || []) {
    await fetchAndProcess(gmail, user, m.id);
  }

  await supabase.from('sync_state').upsert({
    user_id: user.id,
    last_history_id: String(profile.historyId),
    last_synced_at: new Date().toISOString(),
  });
}

export async function incrementalSync(user) {
  const gmail = await getAuthedGmailClient(user);

  const { data: syncState } = await supabase
    .from('sync_state')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!syncState?.last_history_id) {
    await backfillLast7Days(user);
    return;
  }

  try {
    let pageToken;
    const newMessageIds = new Set();
    let latestHistoryId = syncState.last_history_id;

    do {
      const { data } = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: syncState.last_history_id,
        historyTypes: ['messageAdded'],
        pageToken,
      });
      for (const record of data.history || []) {
        for (const added of record.messagesAdded || []) {
          newMessageIds.add(added.message.id);
        }
      }
      if (data.historyId) latestHistoryId = data.historyId;
      pageToken = data.nextPageToken;
    } while (pageToken);

    for (const id of newMessageIds) {
      await fetchAndProcess(gmail, user, id);
    }

    await supabase.from('sync_state').upsert({
      user_id: user.id,
      last_history_id: String(latestHistoryId),
      last_synced_at: new Date().toISOString(),
    });
  } catch (err) {
    // Gmail returns 404 when the startHistoryId is too old (history expired,
    // typically after ~7 days). Fall back to a bounded re-backfill.
    if (err.code === 404 || err.response?.status === 404) {
      await backfillLast7Days(user);
      return;
    }
    throw err;
  }
}

export async function revokeGoogleToken(refreshToken) {
  const oauth2Client = getOAuthClient();
  try {
    await oauth2Client.revokeToken(refreshToken);
  } catch (err) {
    console.warn('[gmail] failed to revoke Google token (continuing with local disconnect):', err.message);
  }
}
