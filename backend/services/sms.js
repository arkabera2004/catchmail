import twilio from 'twilio';

let client;
function getClient() {
  if (!client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN are not set — cannot use Twilio.');
    }
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

export function isValidE164(phone) {
  return typeof phone === 'string' && /^\+[1-9]\d{7,14}$/.test(phone);
}

export async function sendVerificationCode(phoneNumber) {
  const c = getClient();
  await c.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID).verifications.create({ to: phoneNumber, channel: 'sms' });
}

export async function checkVerificationCode(phoneNumber, code) {
  const c = getClient();
  const result = await c.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: phoneNumber, code });
  return result.status === 'approved';
}

export async function sendReminderSms(phoneNumber, message) {
  const c = getClient();
  await c.messages.create({ to: phoneNumber, from: process.env.TWILIO_FROM_NUMBER, body: message });
}
