import { config } from '../config.js';
import { formatDate } from '../utils/dates.js';
import { balanceDue, inr } from './pricing.js';
import { bookingToken } from '../utils/tokens.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const C = { forest: '#0B2A1E', lime: '#7CB342', cream: '#F5F1E3', teal: '#2A9DB5', orange: '#F5A623' };
const B = config.business;

export const bookingLink = (b) => `${config.siteUrl}/booking/${b.id}?t=${bookingToken(b.id)}`;
const adminLink = (b) => `${config.siteUrl}/admin?booking=${b.id}`;

/** Guest's phone as a wa.me number: 10-digit Indian numbers get the 91 prefix. */
export const waNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '').replace(/^0+/, '');
  return digits.length === 10 ? `91${digits}` : digits;
};

/** Thank-you message for the guest after a booking request (camp's own wording). Shown on the site and sent on WhatsApp. */
export function thankYouText(b) {
  return [
    '🙏 Thank You for Choosing Cliff Camps Barot! 🏕️',
    '',
    `Dear ${b.guest_name || 'Guest'},`,
    '',
    'Thank you for submitting your booking details with Cliff Camps Barot. 🌿',
    `Booking ref: ${b.code} (${formatDate(b.check_in)} to ${formatDate(b.check_out)})`,
    '',
    'We have received your information and our team will contact you shortly to confirm your booking and share the payment details.',
    '',
    '✨ Get ready to experience the peaceful beauty of Barot Valley, riverside camping, delicious food, and unforgettable mountain vibes!',
    '',
    '📍 Location: Barot Valley, Himachal Pradesh',
    '',
    'Cliff Camps Barot',
    'Where Mountains Meet Peace. ❤️'
  ].join('\n');
}

/** "Booking confirmed" message for the guest. Shown on the site once confirmed and sent on WhatsApp by the admin. */
export function confirmedText(b) {
  return [
    `✅ Booking Confirmed - Cliff Camps Barot! 🏕️`,
    '',
    `Dear ${b.guest_name || 'Guest'},`,
    '',
    `Your booking at Cliff Camps Barot is confirmed. 🌿`,
    `Booking ref: ${b.code}`,
    `Dates: ${formatDate(b.check_in)} to ${formatDate(b.check_out)} (${b.nights} night${b.nights > 1 ? 's' : ''}) · ${b.guests} guest${b.guests > 1 ? 's' : ''}`,
    `Paid: ${inr(b.amount_paid || 0)} · Balance at the camp: ${inr(balanceDue(b))}`,
    `Your booking & receipt: ${bookingLink(b)}`,
    '',
    '📍 Location: Old Hatchery, Barot - Lohardi Road, Barot Valley, Himachal Pradesh',
    '',
    'See you by the river!',
    'Cliff Camps Barot',
    'Where Mountains Meet Peace. ❤️'
  ].join('\n');
}

// api.whatsapp.com/send rather than wa.me: wa.me's redirect turns emoji into "�"
export const thankYouWhatsappLink = (b) => `https://api.whatsapp.com/send?phone=${waNumber(b.phone)}&text=${encodeURIComponent(thankYouText(b))}`;

const METHOD_LABEL ={ upi: 'UPI', razorpay: 'Razorpay (online)', property: 'Paid at property' };

function layout(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#eef0ea;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1d2a22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0ea;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden">
  <tr><td style="background:${C.forest};padding:24px;text-align:center">
    <img src="${config.siteUrl}/logo-192.png" width="84" height="84" alt="Cliff Camps, Barot" style="display:block;margin:0 auto 8px;border-radius:50%">
    <div style="color:${C.cream};font-size:13px;letter-spacing:3px;text-transform:uppercase">Explore the Nature</div>
  </td></tr>
  <tr><td style="padding:28px 28px 8px">${body}</td></tr>
  <tr><td style="padding:20px 28px 28px;font-size:13px;color:#5b6b60;border-top:1px solid #e6e9e2">
    <strong style="color:${C.forest}">${esc(B.name)}</strong> &middot; ${esc(B.address)}<br>
    ${B.phones.map((p) => `${p.number} (${p.name})`).join(' &middot; ')} &middot; <a href="mailto:${B.email}" style="color:${C.teal}">${B.email}</a><br>
    <a href="https://wa.me/${B.whatsapp}" style="color:${C.teal}">WhatsApp</a> &middot; <a href="${B.instagram}" style="color:${C.teal}">Instagram</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href, label, bg = C.lime) =>
  `<a href="${href}" style="display:inline-block;background:${bg};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;margin:8px 0">${esc(label)}</a>`;

function summaryTable(b, tent) {
  const rows = [
    ['Booking ref', `<strong>${esc(b.code)}</strong>`],
    ['Tent', esc(tent?.name || '')],
    ['Check-in', formatDate(b.check_in)],
    ['Check-out', formatDate(b.check_out)],
    ['Nights', b.nights],
    ['Guests', b.guests],
    ['Total', `<strong>${inr(b.total_price)}</strong>${Number(b.tax_amount) > 0 ? ` <span style="color:#777">(incl. ${inr(b.tax_amount)} tax)</span>` : ''}`],
    ['Advance to confirm', inr(b.advance_amount)]
  ];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;margin:12px 0">${rows
    .map(([k, v]) => `<tr><td style="padding:8px 0;color:#5b6b60;border-bottom:1px solid #eef0ea">${k}</td><td style="padding:8px 0;text-align:right;border-bottom:1px solid #eef0ea">${v}</td></tr>`)
    .join('')}</table>`;
}

export function guestRequestEmail(b, tent) {
  const subject = `Booking request received - ${b.code} | Cliff Camps, Barot`;
  const html = layout(subject, `
    <h1 style="margin:0 0 8px;font-size:22px;color:${C.forest}">Thank you, ${esc(b.guest_name)}!</h1>
    <p style="margin:0 0 12px;line-height:1.6">We've received your booking request for riverside camping at Cliff Camps, Barot. Your dates are held for you while you complete the advance payment.</p>
    ${summaryTable(b, tent)}
    <p style="line-height:1.6">To confirm, pay the advance of <strong>${inr(b.advance_amount)}</strong>. ${b.payment_method === 'razorpay' ? 'You can pay online from your booking page.' : `We'll share the payment details on WhatsApp - or message us at ${B.whatsapp.slice(2)}.`} The balance can be paid at the property.</p>
    <p style="text-align:center">${button(bookingLink(b), 'View your booking')}</p>
    <p style="font-size:13px;color:#5b6b60;line-height:1.6">Questions? Reply to this email or WhatsApp us at ${B.whatsapp.slice(2)}.</p>`);
  return { subject, html };
}

export function adminNewBookingEmail(b, tent) {
  const subject = `New booking request ${b.code} - ${b.guest_name} (${b.check_in} to ${b.check_out})`;
  const html = layout(subject, `
    <h1 style="margin:0 0 8px;font-size:20px;color:${C.forest}">New booking request</h1>
    ${summaryTable(b, tent)}
    <p style="font-size:14px;line-height:1.7"><strong>Guest:</strong> ${esc(b.guest_name)}<br>
    <strong>Phone:</strong> <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a> &middot; <a href="https://wa.me/${esc(waNumber(b.phone))}">WhatsApp</a><br>
    <strong>Email:</strong> ${esc(b.email)}<br>
    <strong>Preferred payment:</strong> ${esc(METHOD_LABEL[b.payment_method] || '-')}<br>
    ${b.notes ? `<strong>Special requests:</strong> ${esc(b.notes)}` : ''}</p>
    <p style="text-align:center">${button(thankYouWhatsappLink(b), 'Send thank-you to guest on WhatsApp', '#25D366')}</p>
    <p style="text-align:center">${button(adminLink(b), 'Open in admin panel', C.forest)}</p>`);
  return { subject, html };
}

export function adminPaymentSubmittedEmail(b, p) {
  const subject = `UPI payment to verify - ${b.code} - ${inr(p.amount)}`;
  const html = layout(subject, `
    <h1 style="margin:0 0 8px;font-size:20px;color:${C.forest}">UPI payment submitted</h1>
    <p style="line-height:1.6">${esc(b.guest_name)} says they paid <strong>${inr(p.amount)}</strong> for booking <strong>${esc(b.code)}</strong>.</p>
    <p style="line-height:1.6">UPI transaction ID: <strong style="font-family:monospace">${esc(p.txn_id)}</strong>${p.proof_path ? '<br>A screenshot was attached.' : ''}</p>
    <p style="line-height:1.6">Check this against your bank / UPI app, then mark it verified in the admin panel. The booking will be confirmed and a receipt emailed automatically.</p>
    <p style="text-align:center">${button(`${config.siteUrl}/admin?tab=payments`, 'Verify payment', C.forest)}</p>`);
  return { subject, html };
}

/** Confirmation + receipt (HTML receipt, printable from any mail client). */
export function receiptEmail(b, tent, payments) {
  const paid = payments.filter((p) => ['verified', 'captured'].includes(p.status));
  const subject = `Booking confirmed & payment receipt - ${b.code} | Cliff Camps, Barot`;
  const html = layout(subject, `
    <div style="display:inline-block;background:${C.lime};color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;padding:4px 12px;border-radius:999px">CONFIRMED</div>
    <h1 style="margin:12px 0 8px;font-size:22px;color:${C.forest}">See you by the river, ${esc(b.guest_name)}!</h1>
    <p style="margin:0 0 12px;line-height:1.6">Your stay at Cliff Camps, Barot is confirmed. This email is your payment receipt.</p>
    ${summaryTable(b, tent)}
    <h2 style="font-size:16px;color:${C.forest};margin:20px 0 4px">Receipt</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse">
      <tr style="color:#5b6b60;font-size:12px;text-transform:uppercase"><td style="padding:6px 0">Date</td><td>Method</td><td>Reference</td><td style="text-align:right">Amount</td></tr>
      ${paid.map((p) => `<tr><td style="padding:6px 0;border-top:1px solid #eef0ea">${new Date(p.updated_at || p.created_at).toLocaleDateString('en-IN')}</td><td style="border-top:1px solid #eef0ea">${METHOD_LABEL[p.method] || p.method}</td><td style="border-top:1px solid #eef0ea;font-family:monospace;font-size:12px">${esc(p.txn_id || p.provider_payment_id || '-')}</td><td style="text-align:right;border-top:1px solid #eef0ea">${inr(p.amount)}</td></tr>`).join('')}
      <tr><td colspan="3" style="padding:10px 0;border-top:2px solid ${C.forest};font-weight:700">Total paid</td><td style="text-align:right;border-top:2px solid ${C.forest};font-weight:700">${inr(b.amount_paid)}</td></tr>
      <tr><td colspan="3" style="padding:4px 0;color:#5b6b60">Balance (pay at property)</td><td style="text-align:right;color:#5b6b60">${inr(balanceDue(b))}</td></tr>
    </table>
    <p style="text-align:center;margin-top:20px">${button(bookingLink(b), 'View booking')}</p>
    <p style="font-size:13px;color:#5b6b60;line-height:1.6">Find us at ${esc(B.address)}. Call ${B.phones[0].number} (${B.phones[0].name}) when you reach Barot.</p>`);
  return { subject, html };
}

export function guestCancelledEmail(b) {
  const subject = `Booking ${b.code} cancelled | Cliff Camps, Barot`;
  const html = layout(subject, `
    <h1 style="margin:0 0 8px;font-size:20px;color:${C.forest}">Your booking has been cancelled</h1>
    <p style="line-height:1.6">Booking <strong>${esc(b.code)}</strong> (${formatDate(b.check_in)} - ${formatDate(b.check_out)}) has been cancelled.
    ${Number(b.amount_paid) > 0 ? 'Any refund due will be processed by our team - we will contact you.' : ''}</p>
    <p style="line-height:1.6">If this is unexpected, please call ${B.phones[0].number} or WhatsApp us.</p>`);
  return { subject, html };
}
