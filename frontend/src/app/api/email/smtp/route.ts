/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    // Use exactly what is in the # SMTP Configuration (Server-side only) section of .env
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.error('[SMTP] Missing environment variables from # SMTP Configuration section');
      return NextResponse.json({ 
        success: false, 
        error: 'SMTP configuration incomplete. Please check your .env variables.' 
      }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Gonza Systems'}" <${smtpFrom || smtpUser}>`,
      to,
      subject,
      html,
    });

    console.log('[SMTP] Email sent successfully using configured section:', info.messageId);
    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('[SMTP API Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
