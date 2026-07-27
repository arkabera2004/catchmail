import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createSubscription, verifyWebhookSignature } from '../services/razorpay.js';

const router = Router();

router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.session.userId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { subscriptionId, keyId } = await createSubscription(user);

    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      razorpay_subscription_id: subscriptionId,
      status: 'created',
    });

    res.json({ subscriptionId, keyId });
  } catch (err) {
    console.error('[billing] checkout failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Registered in app.js with express.raw() so req.body is the raw Buffer
// needed for signature verification.
router.post('/webhooks/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const isValid = verifyWebhookSignature(req.body, signature);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(req.body.toString('utf8'));
    const subscriptionEntity = event.payload?.subscription?.entity;

    if (subscriptionEntity) {
      const razorpaySubId = subscriptionEntity.id;
      const status = subscriptionEntity.status; // e.g. active, halted, cancelled
      const currentPeriodEnd = subscriptionEntity.current_end
        ? new Date(subscriptionEntity.current_end * 1000).toISOString()
        : null;

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('razorpay_subscription_id', razorpaySubId)
        .maybeSingle();

      if (sub) {
        await supabase
          .from('subscriptions')
          .update({ status, current_period_end: currentPeriodEnd })
          .eq('razorpay_subscription_id', razorpaySubId);

        const plan = status === 'active' ? 'paid' : 'free';
        await supabase.from('users').update({ plan }).eq('id', sub.user_id);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[billing] webhook handling failed:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
