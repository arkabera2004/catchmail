import { Resend } from 'resend';

let client;
function getClient() {
  if (!client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set — cannot send email.');
    }
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

function formatDeadline(deadline) {
  if (!deadline) return 'No deadline';
  return new Date(deadline).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildDigestHtml(tasks) {
  const rows = tasks
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.task_text}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatDeadline(t.deadline)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">
          <a href="${t.source_email_link}">View email</a>
        </td>
      </tr>`
    )
    .join('');

  return `
  <div style="font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color:#111;">Your CatchMail digest</h2>
    <p style="color:#555;">${tasks.length} new task${tasks.length === 1 ? '' : 's'} found in the last 24 hours:</p>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #333;">Task</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #333;">Deadline</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #333;">Source</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#999;font-size:12px;margin-top:24px;">
      Open your <a href="${process.env.APP_URL}/dashboard">CatchMail dashboard</a> to manage tasks.
    </p>
  </div>`;
}

export async function sendDigestEmail(user, tasks) {
  const resend = getClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not set.');
  }

  await resend.emails.send({
    from,
    to: user.email,
    subject: `CatchMail: ${tasks.length} new task${tasks.length === 1 ? '' : 's'} from your inbox`,
    html: buildDigestHtml(tasks),
  });
}

function formatWeeklyDeadline(deadline) {
  if (!deadline) return 'No deadline';
  return new Date(deadline).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildWeeklySummaryHtml(meetings, tasks) {
  const meetingRows = meetings
    .map(
      (m) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">📅 ${m.task_text}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatWeeklyDeadline(m.deadline)}</td>
      </tr>`
    )
    .join('');

  const taskRows = tasks
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.task_text}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatWeeklyDeadline(t.deadline)}</td>
      </tr>`
    )
    .join('');

  return `
  <div style="font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color:#111;">Your week ahead</h2>
    ${
      meetings.length > 0
        ? `<h3 style="color:#333;">Meetings (${meetings.length})</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tbody>${meetingRows}</tbody>
    </table>`
        : ''
    }
    ${
      tasks.length > 0
        ? `<h3 style="color:#333;">Tasks due this week (${tasks.length})</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tbody>${taskRows}</tbody>
    </table>`
        : ''
    }
    <p style="color:#999;font-size:12px;margin-top:24px;">
      Open your <a href="${process.env.APP_URL}/dashboard">CatchMail dashboard</a> to manage tasks.
    </p>
  </div>`;
}

export async function sendWeeklySummaryEmail(user, meetings, tasks) {
  const resend = getClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not set.');
  }

  const total = meetings.length + tasks.length;
  await resend.emails.send({
    from,
    to: user.email,
    subject: `CatchMail: your week ahead — ${total} item${total === 1 ? '' : 's'}`,
    html: buildWeeklySummaryHtml(meetings, tasks),
  });
}
