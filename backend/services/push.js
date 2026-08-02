import webpush from 'web-push';
import { supabase } from '../db/supabase.js';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are not set — cannot send push notifications.');
  }
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:support@catchmail.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export function validatePushSubscription(body) {
  const { endpoint, keys } = body || {};
  if (!endpoint || typeof endpoint !== 'string') return { error: 'endpoint is required' };
  if (!keys?.p256dh || !keys?.auth) return { error: 'keys.p256dh and keys.auth are required' };
  return {};
}

/** Sends a push notification to every browser subscription on file for a
 * user. Expired/gone subscriptions (410/404) are deleted so dead endpoints
 * don't accumulate; other send failures are logged, not retried, matching
 * the per-item try/catch pattern used in jobs/sync.js and jobs/digest.js. */
export async function sendPushToUser(userId, payload) {
  ensureConfigured();
  const { data: subscriptions, error } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);
  if (error) throw error;

  for (const sub of subscriptions || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        console.error(`[push] send failed for subscription ${sub.id}:`, err.message);
      }
    }
  }
}
