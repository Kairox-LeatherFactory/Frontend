import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';


const SMTP_EMAIL = process.env.SMTP_EMAIL || 'danishahamed2023@gmail.com';
const SMTP_PASSWORD = (process.env.SMTP_PASSWORD || 'cdtg rssa qgen tkaa').replace(/\s+/g, '');
const SUPPLIER_EMAIL = 'workspacekaizen@gmail.com'; // Supplier / procurement lead email

export async function POST(req) {
  try {
    const { pdfBase64, toEmail, subject, text, bomId } = await req.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Kairox Leather Factory" <${SMTP_EMAIL}>`,
      to: toEmail || SUPPLIER_EMAIL,
      subject: subject || `Purchase Order PO-${bomId} from Kairox`,
      text: text || `Hello,\n\nPlease find attached the Purchase Order PO-${bomId} for your reference.\n\nRegards,\nKairox Procurement Team`,
      attachments: [
        {
          filename: `PO_Form_${bomId}.pdf`,
          content: pdfBase64.split('base64,')[1] || pdfBase64,
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
