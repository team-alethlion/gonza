/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000/api";

export async function GET() {
  try {
    const res = await fetch(`${DJANGO_API_URL}/core/crons/activity_cleanup/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CRON_SECRET || ''}`
      }
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
