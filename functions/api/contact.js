// Rebloom "Say hello" messages. Runs on Cloudflare Pages at /api/contact.
// Uses the same settings as signup.js: RESEND_API_KEY, NOTIFY_EMAIL, FROM_EMAIL.

const DEFAULT_BOOKING_URL = 'https://calendar.app.google/ibyeinDk3GVJXzP27';
const GUIDE_URL = 'https://rebloomwithnes.co.uk/assets/rebloom-mini-guide.pdf';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
  if (body.company) return json({ ok: true }); // honeypot

  const email = clean(body.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: 'email' }, 400);
  const message = clean(body.message, 4000);
  if (!message) return json({ ok: false, error: 'message' }, 400);
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL || !env.NOTIFY_EMAIL) return json({ ok: false, error: 'not_configured' }, 500);

  const name = clean(body.name, 80) || 'Someone';
  const topic = clean(body.topic, 60);

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.FROM_EMAIL, to: [env.NOTIFY_EMAIL], reply_to: email,
      subject: `Message from ${name}${topic ? ` · ${topic}` : ''}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#2E2638"><p><b>${esc(name)}</b> (${esc(email)}) wrote${topic ? ` about <b>${esc(topic)}</b>` : ''}:</p><blockquote style="margin:0;padding:12px 16px;background:#FBE9E6;border-radius:12px;white-space:pre-wrap">${esc(message)}</blockquote><p style="color:#6B6276">Reply to this email to answer ${esc(name)} directly.</p></div>`,
    }),
  });
  if (!r.ok) return json({ ok: false, error: 'send_failed' }, 502);

  // Auto-reply to the sender, so they know it arrived.
  const hi = name === 'Someone' ? 'Hi,' : `Hi ${esc(name)},`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.FROM_EMAIL, to: [email], reply_to: env.NOTIFY_EMAIL,
      subject: 'Got your message · Rebloom',
      html: `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#2E2638;max-width:520px">
<p>${hi}</p>
<p>Thank you for writing to me. I read every message myself, and I'll reply within a few days.</p>
<p>While you wait, here's <a href="${GUIDE_URL}" style="color:#9B4F6A;font-weight:bold">my mini-guide</a> on what to expect from Rebloom. And if you'd rather just talk, you can <a href="${esc(env.BOOKING_URL || DEFAULT_BOOKING_URL)}" style="color:#9B4F6A;font-weight:bold">book a 15-minute call with me</a>.</p>
<p style="font-size:20px;color:#9B4F6A;margin-top:24px">Nes x</p>
<hr style="border:0;border-top:1px solid #EADFD3;margin:28px 0 12px">
<p style="font-size:12px;color:#6B6276">You're getting this because you sent a message at rebloomwithnes.co.uk. Rebloom isn't therapy or medical advice. If you're struggling right now, Samaritans are free, any time, on 116 123 (UK). In an emergency, call 999.</p>
</div>`,
    }),
  }).catch(() => {});

  return json({ ok: true });
}

function clean(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }
