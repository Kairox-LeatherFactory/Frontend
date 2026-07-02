import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    const { toEmail, subject, text } = await req.json();

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      throw new Error('SMTP credentials are not configured in environment variables.');
    }

    const appPassword = process.env.SMTP_PASSWORD.replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: appPassword,
      },
    });

    const mailOptions = {
      from: `"Kairox Procurement" <${process.env.SMTP_EMAIL}>`,
      to: toEmail || process.env.SMTP_EMAIL,
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
