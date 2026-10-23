import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { config } from '../config.js';

const OUTBOX = path.join(process.env.MEMORY_DB_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.data'), 'outbox');
let transport;

function provider() {
  if (config.mail.resendKey) return 'resend';
  if (config.mail.smtp.user && config.mail.smtp.pass) return 'smtp';
  return 'console';
}

/**
 * Sends an email via Resend (if RESEND_API_KEY is set) or Gmail SMTP (SMTP_USER + app password).
 * Without either (local dev) emails are written to backend/.data/outbox as .html files.
 * Never throws: a mail failure must not break a booking.
 */
export async function sendMail({ to, subject, html, text, replyTo }) {
  const kind = provider();
  try {
    if (kind === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.mail.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.mail.from, to: [to], subject, html, text, reply_to: replyTo })
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    } else if (kind === 'smtp') {
      transport ||= nodemailer.createTransport({
        host: config.mail.smtp.host,
        port: config.mail.smtp.port,
        secure: config.mail.smtp.port === 465,
        auth: { user: config.mail.smtp.user, pass: config.mail.smtp.pass }
      });
      await transport.sendMail({ from: config.mail.from, to, subject, html, text, replyTo });
    } else {
      if (config.isProd) {
        console.warn(`[mail] No email provider configured - not sent: "${subject}" -> ${to}`);
        return { ok: false, provider: kind };
      }
      fs.mkdirSync(OUTBOX, { recursive: true });
      const file = path.join(OUTBOX, `${Date.now()}-${subject.replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}.html`);
      fs.writeFileSync(file, `<!-- To: ${to} | Subject: ${subject} -->\n${html}`);
      console.log(`[mail:dev] "${subject}" -> ${to} (saved ${path.basename(file)})`);
    }
    return { ok: true, provider: kind };
  } catch (err) {
    console.error(`[mail] Failed to send "${subject}" to ${to}:`, err.message);
    return { ok: false, provider: kind, error: err.message };
  }
}
