import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { decrypt } from '../lib/crypto.js';
import { revokeGoogleToken } from '../services/gmail.js';
import { validatePushSubscription } from '../services/push.js';
import { isValidE164, sendVerificationCode, checkVerificationCode } from '../services/sms.js';

const router = Router();
router.use(requireAuth);

const MOBILE_LAYOUTS = ['tabs', 'stacked', 'next_up'];
const REMINDER_LEAD_OPTIONS = [10, 30, 60];

export function validatePreferencesUpdate(body) {
  const { dashboard_mobile_layout, reminder_lead_minutes } = body;
  const updates = {};
  if (dashboard_mobile_layout !== undefined) {
    if (!MOBILE_LAYOUTS.includes(dashboard_mobile_layout)) {
      return { error: `dashboard_mobile_layout must be one of: ${MOBILE_LAYOUTS.join(', ')}` };
    }
    updates.dashboard_mobile_layout = dashboard_mobile_layout;
  }
  if (reminder_lead_minutes !== undefined) {
    if (!REMINDER_LEAD_OPTIONS.includes(reminder_lead_minutes)) {
      return { error: `reminder_lead_minutes must be one of: ${REMINDER_LEAD_OPTIONS.join(', ')}` };
    }
    updates.reminder_lead_minutes = reminder_lead_minutes;
  }
  if (Object.keys(updates).length === 0) {
    return { error: 'No valid fields to update' };
  }
  return { updates };
}

router.patch('/preferences', async (req, res) => {
  const { updates, error: validationError } = validatePreferencesUpdate(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.session.userId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: data });
});

router.post('/push/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body;
  const { error: validationError } = validatePushSubscription(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: req.session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.post('/push/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', req.session.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

async function requireProPlan(req, res, next) {
  const { data: user, error } = await supabase.from('users').select('plan').eq('id', req.session.userId).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (user?.plan !== 'paid') return res.status(403).json({ error: 'SMS reminders are a Pro feature' });
  next();
}

router.post('/phone/send-code', requireProPlan, async (req, res) => {
  const { phone_number } = req.body;
  if (!isValidE164(phone_number)) {
    return res.status(400).json({ error: 'phone_number must be in E.164 format, e.g. +15551234567' });
  }
  try {
    await sendVerificationCode(phone_number);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/phone/verify', requireProPlan, async (req, res) => {
  const { phone_number, code } = req.body;
  if (!isValidE164(phone_number) || !code) {
    return res.status(400).json({ error: 'phone_number and code are required' });
  }
  try {
    const approved = await checkVerificationCode(phone_number, code);
    if (!approved) return res.status(400).json({ error: 'Invalid or expired code' });

    const { error } = await supabase
      .from('users')
      .update({ phone_number, phone_verified: true })
      .eq('id', req.session.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pause', async (req, res) => {
  const { error } = await supabase.from('users').update({ paused: true }).eq('id', req.session.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.post('/resume', async (req, res) => {
  const { error } = await supabase.from('users').update({ paused: false }).eq('id', req.session.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.post('/disconnect', async (req, res) => {
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.session.userId)
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });

  if (user?.google_refresh_token_enc) {
    try {
      const refreshToken = decrypt(user.google_refresh_token_enc);
      await revokeGoogleToken(refreshToken);
    } catch (err) {
      console.warn('[settings] token revoke failed:', err.message);
    }
  }

  const { error } = await supabase
    .from('users')
    .update({ google_refresh_token_enc: null, paused: true })
    .eq('id', req.session.userId);
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('sync_state').delete().eq('user_id', req.session.userId);

  res.json({ ok: true });
});

router.post('/delete-all', async (req, res) => {
  const userId = req.session.userId;

  const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (user?.google_refresh_token_enc) {
    try {
      const refreshToken = decrypt(user.google_refresh_token_enc);
      await revokeGoogleToken(refreshToken);
    } catch (err) {
      console.warn('[settings] token revoke failed during delete-all:', err.message);
    }
  }

  // Cascading FKs remove tasks, sync_state, subscriptions automatically.
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });

  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

export default router;
