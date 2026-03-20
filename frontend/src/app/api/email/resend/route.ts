import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_fallback_key_for_build');

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    const fromDomain = process.env.RESEND_DOMAIN || 'resend.dev';
    const fromEmailAddress = fromDomain.includes('@') ? fromDomain : `verification@${fromDomain}`;
    const fromField = `Gonza Systems <${fromEmailAddress}>`;

    const { data, error } = await resend.emails.send({
      from: fromField,
      to: [to],
      subject,
      html,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  } catch (error: any) {
    console.error('[Resend API Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
