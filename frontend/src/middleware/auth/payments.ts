import { NextResponse } from "next/server";

export const paymentsProxy = (auth: any, nextUrl: any) => {
  // Payment callbacks and IPN routes must be publicly accessible 
  // so Pesapal can send notifications and users can be redirected back.
  return true; 
};
