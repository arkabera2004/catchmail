import Razorpay from 'razorpay';
import crypto from 'node:crypto';

let client;
function getClient() {
  if (!client) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — cannot use billing.');
    }
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
}

/**
 * Creates a Razorpay subscription for the paid tier. The frontend uses the
 * returned subscription id to open Razorpay Checkout.
 */
export async function createSubscription(user) {
  const razorpay = getClient();
  if (!process.env.RAZORPAY_PLAN_ID) {
    throw new Error('RAZORPAY_PLAN_ID is not set.');
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: process.env.RAZORPAY_PLAN_ID,
    customer_notify: 1,
    total_count: 12, // 12 billing cycles; renews are handled by webhook updates
    notes: { catchmail_user_id: user.id },
  });

  return {
    subscriptionId: subscription.id,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}

export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not set.');
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}
