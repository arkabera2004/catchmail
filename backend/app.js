import express from 'express';
import cors from 'cors';
import session from 'express-session';

import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import settingsRoutes from './routes/settings.js';
import billingRoutes from './routes/billing.js';
import calendarRoutes from './routes/calendar.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.APP_URL || 'http://localhost:3000',
      credentials: true,
    })
  );

  const isProduction = process.env.NODE_ENV === 'production';
  // Frontend and backend live on different domains in production (Vercel +
  // Railway), so the session cookie needs SameSite=None to survive the
  // cross-site fetch — which in turn requires Secure, hence the split from dev.
  if (isProduction) app.set('trust proxy', 1);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // Razorpay webhook needs the raw request body for signature verification,
  // so it gets express.raw() ahead of the global JSON body parser below.
  app.use('/api/billing/webhooks/razorpay', express.raw({ type: 'application/json' }));
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.use('/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/calendar', calendarRoutes);

  return app;
}
