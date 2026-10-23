import { config } from '../config.js';

/** Direct UPI to the camp's own UPI ID: zero fees, verified manually by the admin. */
export const upiProvider = {
  id: 'upi',
  label: 'UPI (GPay / PhonePe / Paytm)',
  isEnabled: () => Boolean(config.upi.id),
  publicConfig: () => ({ payeeName: config.upi.payeeName, upiId: config.upi.id }),

  /** upi://pay deep link - also encoded in the QR code shown on the booking page. */
  buildUri({ amount, note }) {
    const params = new URLSearchParams({
      pa: config.upi.id,
      pn: config.upi.payeeName,
      am: Number(amount).toFixed(2),
      cu: 'INR',
      tn: note
    });
    // URLSearchParams encodes spaces as '+', which some UPI apps show literally
    return `upi://pay?${params.toString().replace(/\+/g, '%20')}`;
  },

  async initiate({ booking, amount }) {
    return { method: 'upi', amount, uri: this.buildUri({ amount, note: booking.code }), payeeName: config.upi.payeeName, upiId: config.upi.id };
  }
};
