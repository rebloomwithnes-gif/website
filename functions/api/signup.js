// Rebloom waitlist sign-ups.
// Runs on Cloudflare Pages at /api/signup.
//
// Settings (Cloudflare Pages > Settings > Variables and Secrets):
//   RESEND_API_KEY      secret, from resend.com (never put it in this file)
//   NOTIFY_EMAIL        where sign-up alerts go, e.g. Nes's inbox
//   FROM_EMAIL          e.g.  Nes at Rebloom <hello@rebloomwithnes.co.uk>
//   BOOKING_URL         optional, link to book the 15-minute call
//   RESEND_AUDIENCE_ID  optional, Resend audience to keep the waitlist in

const DEFAULT_BOOKING_URL = 'https://calendar.app.google/ibyeinDk3GVJXzP27';
const GUIDE_URL = 'https://rebloomwithnes.co.uk/assets/rebloom-mini-guide.pdf';
const MAX = { email: 254, name: 80, city: 40, now: 2000, how: 40, phone: 40 };

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }

  // Honeypot: real people never fill this hidden field.
  if (body.company) return json({ ok: true });

  const email = clean(body.email, MAX.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: 'email' }, 400);
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL || !env.NOTIFY_EMAIL) return json({ ok: false, error: 'not_configured' }, 500);

  const stage = body.stage === 'full' ? 'full' : 'email';
  const name = clean(body.name, MAX.name);

  // Keep everyone who leaves an email, even if they skip the questions.
  if (env.RESEND_AUDIENCE_ID) {
    await resend(env, `audiences/${env.RESEND_AUDIENCE_ID}/contacts`, {
      email, first_name: name || undefined, unsubscribed: false,
    }).catch(() => {});
  }

  if (stage === 'email') {
    // Without an audience, tell Nes straight away so no email is ever lost.
    if (!env.RESEND_AUDIENCE_ID) {
      await sendEmail(env, {
        to: [env.NOTIFY_EMAIL], reply_to: email,
        subject: `New spot claimed: ${email}`,
        html: `<p>Someone claimed a spot: <b>${esc(email)}</b>.</p><p>They haven't answered the questions yet. If they do, a full sign-up email follows.</p>`,
      }).catch(() => {});
    }
    return json({ ok: true });
  }

  if (!name) return json({ ok: false, error: 'name' }, 400);
  if (body.consent !== true) return json({ ok: false, error: 'consent' }, 400);

  const petals = Array.isArray(body.petals) ? body.petals.slice(0, 3).map(p => clean(p, 20)).filter(Boolean) : [];
  const fields = [
    ['Name', name],
    ['Email', email],
    ['Based', clean(body.city, MAX.city)],
    ['Wants to work on', petals.join(', ')],
    ['Why now', clean(body.now, MAX.now)],
    ['Best way to call', clean(body.how, MAX.how)],
    ['Phone / WhatsApp', clean(body.phone, MAX.phone)],
    ['Consent to be contacted', 'Yes'],
  ];

  // 1. Alert to Nes. Replying goes straight to the person.
  const rows = fields.map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#6B6276;vertical-align:top">${k}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(v) || '<span style="color:#aaa">not given</span>'}</td></tr>`).join('');
  try {
    await sendEmail(env, {
      to: [env.NOTIFY_EMAIL], reply_to: email,
      subject: `New Rebloom sign-up: ${name}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#2E2638"><p><b>${esc(name)}</b> claimed a founding spot and answered the questions.</p><table>${rows}</table><p style="color:#6B6276">Reply to this email to write to ${esc(name)} directly.</p></div>`,
    });
  } catch (e) {
    return json({ ok: false, error: 'send_failed' }, 502);
  }

  // 2. Welcome email to her, with the booking link and the mini-guide.
  const bookingUrl = env.BOOKING_URL || DEFAULT_BOOKING_URL;
  const booking = `<p>Next is a 15-minute call. It's not an interview, just a chat about why you're here and what you're hoping changes.</p>
<p style="margin:22px 0"><a href="${esc(bookingUrl)}" style="background:#9B4F6A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:99px;font-weight:bold;display:inline-block">Pick a time for our call</a></p>
<p>And here's <a href="${GUIDE_URL}" style="color:#9B4F6A;font-weight:bold">your mini-guide</a>: what to expect from Rebloom, plus 5 questions to find your bloom. Have a look before our call if you like. Two words per question is plenty.</p>`;
  await sendEmail(env, {
    to: [email], reply_to: env.NOTIFY_EMAIL,
    subject: `Your Rebloom spot is saved, ${name}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#2E2638;max-width:520px">
<p>Hi ${esc(name)},</p>
<p>Thank you for claiming your spot. I read every one of these myself, so I'll read yours properly.</p>
${booking}
<p>If anything comes up before then, just reply to this email. It comes straight to me.</p>
<p style="font-size:20px;color:#B04A64;margin-top:24px">Nes x</p>
<hr style="border:0;border-top:1px solid #EADFD3;margin:28px 0 12px">
<p style="font-size:12px;color:#6B6276">You're getting this because you signed up at rebloomwithnes.co.uk. Reply "delete" any time and I'll remove your details. Rebloom isn't therapy or medical advice. If you're struggling right now, Samaritans are free, any time, on 116 123.</p>
</div>`,
  }).catch(() => {});

  return json({ ok: true });
}

async function sendEmail(env, msg) {
  return resend(env, 'emails', { from: env.FROM_EMAIL, ...msg });
}

async function resend(env, path, payload) {
  const r = await fetch(`https://api.resend.com/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`resend ${r.status}`);
  return r.json();
}

function clean(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }
