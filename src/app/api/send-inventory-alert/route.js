import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Demo fallback credentials (used when .env.local is not present)
const SMTP_EMAIL = process.env.SMTP_EMAIL || 'danishahamed2023@gmail.com';
const SMTP_PASSWORD = (process.env.SMTP_PASSWORD || 'cdtg rssa qgen tkaa').replace(/\s+/g, '');

export async function POST(req) {
  try {
    const { toEmail, subject, text } = await req.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Kairox Procurement" <${SMTP_EMAIL}>`,
      to: toEmail || SMTP_EMAIL,
      subject: subject || `Urgent: Stock Shortage Alert`,
      text: text || `Hello,\n\nWe have detected a stock shortage.\n\nRegards,\nKairox Procurement Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending inventory alert email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
