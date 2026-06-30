import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    const { pdfBase64, toEmail, subject, text, bomId } = await req.json();

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      throw new Error('SMTP credentials are not configured in environment variables.');
    }

    // Remove any spaces from the App Password just in case
    const appPassword = process.env.SMTP_PASSWORD.replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: appPassword,
      },
    });

    const mailOptions = {
      from: `"Kairox Leather Factory" <${process.env.SMTP_EMAIL}>`,
      to: toEmail || process.env.SMTP_EMAIL, // if no target provided, send to self for testing
      subject: subject || `Purchase Order PO-${bomId} from Kairox`,
      text: text || `Hello,\n\nPlease find attached the Purchase Order PO-${bomId} for your reference.\n\nRegards,\nKairox Procurement Team`,
      attachments: [
        {
          filename: `PO_Form_${bomId}.pdf`,
          content: pdfBase64.split('base64,')[1] || pdfBase64, // handle with or without prefix
          encoding: 'base64'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
