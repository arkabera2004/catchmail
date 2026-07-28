import { Router } from 'express';
import { google } from 'googleapis';
import { supabase } from '../db/supabase.js';
import { encrypt } from '../lib/crypto.js';
import { getOAuthClient, backfillLast7Days } from '../services/gmail.js';

const router = Router();

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
  'profile',
];

router.get('/google', (req, res) => {
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    // "select_account" always shows Google's account chooser (lets a user pick a
    // different Google account — this is what powers "Switch account" in the app);
    // "consent" ensures a refresh_token is returned even on repeat connects.
    prompt: 'select_account consent',
    scope: SCOPES,
  });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${process.env.APP_URL}/?error=missing_code`);
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token && !tokens.id_token) {
      throw new Error('Google did not return a refresh token or id token.');
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();

    if (!googleUser.email) {
      throw new Error('Could not retrieve email from Google account.');
    }

    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', googleUser.email)
      .maybeSingle();

    const updates = {
      email: googleUser.email,
      name: googleUser.name || null,
      picture: googleUser.picture || null,
    };
    if (tokens.refresh_token) {
      updates.google_refresh_token_enc = encrypt(tokens.refresh_token);
    }

    let user;
    if (existing) {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      user = data;
    } else {
      if (!tokens.refresh_token) {
        throw new Error('First-time connect requires a refresh token but Google did not return one.');
      }
      const { data, error } = await supabase.from('users').insert(updates).select().single();
      if (error) throw error;
      user = data;
    }

    req.session.userId = user.id;

    // Kick off the 7-day backfill in the background; don't block the redirect.
    backfillLast7Days(user).catch((err) => {
      console.error(`[auth] backfill failed for user ${user.id}:`, err);
    });

    res.redirect(`${process.env.APP_URL}/dashboard`);
  } catch (err) {
    console.error('[auth] OAuth callback failed:', err);
    res.redirect(`${process.env.APP_URL}/?error=oauth_failed`);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name, picture, plan, paused, created_at')
    .eq('id', req.session.userId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user });
});

export default router;
