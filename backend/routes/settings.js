import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { decrypt } from '../lib/crypto.js';
import { revokeGoogleToken } from '../services/gmail.js';

const router = Router();
router.use(requireAuth);

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
