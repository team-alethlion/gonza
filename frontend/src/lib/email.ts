/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBaseUrl } from "./utils";

/**
 * Unified Email Utility
 * Routes email requests to either the Resend API or the SMTP/Nodemailer API
 * depending on the EMAIL_PROVIDER environment variable.
 */
export async function sendVerificationEmail(email: string, code: string) {
  const provider = process.env.EMAIL_PROVIDER || "smtp"; // Default to smtp as requested

  const payload = {
    to: email,
    subject: "Verify your email - Gonza Systems",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #252861; text-align: center;">Verify Your Email</h2>
        <p>Hello,</p>
        <p>Thank you for signing up for Gonza Systems. To complete your registration, please use the 6-digit verification code below:</p>
        <div style="background: #f4f4f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #f05a2b; margin: 20px 0; border-radius: 8px;">
          ${code}
        </div>
        <p>This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 Gonza Systems. All rights reserved.</p>
      </div>
    `,
  };

  try {
    // Determine target API endpoint
    const apiEndpoint =
      provider === "smtp" ? "/api/email/smtp" : "/api/email/resend";

    // In Server Actions, we can call the logic directly or use fetch if preferred.
    // To maintain the "API" structure requested, we'll fetch our own internal route.
    // NOTE: On some serverless environments, internal fetches need the full absolute URL.
    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}${apiEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error(`[Email Service Error - ${provider}]:`, error);
    return { success: false, error: error.message };
  }
}

export async function sendSubscriptionNotificationEmail(
  email: string,
  details: {
    userName: string;
    planName: string;
    status: string;
    expiryDate: string;
    price: string;
    limits: {
      users: string;
      products: string;
      sales: string;
    };
    isTrial: boolean;
  },
) {
  const provider = process.env.EMAIL_PROVIDER || "smtp";

  const payload = {
    to: email,
    subject: `Subscription ${
      details.isTrial ? "Trial Activated" : "Confirmed"
    } - Gonza Systems`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; color: #333;">
        <div style="background: #252861; padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">Subscription ${
            details.isTrial ? "Trial Activated" : "Confirmed"
          }</h1>
        </div>
        
        <div style="padding: 30px; line-height: 1.6;">
          <p style="font-size: 18px; margin-top: 0;">Hello <strong>${
            details.userName
          }</strong>,</p>
          <p>Your subscription to the <strong>${
            details.planName
          }</strong> plan has been successfully ${
      details.isTrial ? "activated as a free trial" : "confirmed"
    }. You now have full access to Gonza Systems.</p>
          
          <div style="background: #f8f9fa; border-left: 4px solid #f05a2b; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #252861; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Plan Overview</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Status:</strong></td>
                <td style="padding: 8px 0;">${details.status}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Price:</strong></td>
                <td style="padding: 8px 0;">${details.price}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Expiry Date:</strong></td>
                <td style="padding: 8px 0; font-weight: bold; color: #f05a2b;">${
                  details.expiryDate
                }</td>
              </tr>
            </table>
          </div>

          <h3 style="color: #252861; font-size: 16px; margin-bottom: 15px;">Your Included Quotas:</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 10px; display: flex; align-items: center;">
              <span style="color: #28a745; margin-right: 10px;">✔</span> 
              <span>Up to <strong>${
                details.limits.users
              }</strong> Team Members</span>
            </li>
            <li style="margin-bottom: 10px; display: flex; align-items: center;">
              <span style="color: #28a745; margin-right: 10px;">✔</span> 
              <span>Up to <strong>${
                details.limits.products
              }</strong> Products</span>
            </li>
            <li style="margin-bottom: 10px; display: flex; align-items: center;">
              <span style="color: #28a745; margin-right: 10px;">✔</span> 
              <span>Up to <strong>${
                details.limits.sales
              }</strong> Sales per Month</span>
            </li>
          </ul>

          <div style="text-align: center; margin-top: 40px;">
            <a href="${getBaseUrl()}/agency" 
               style="background: #252861; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(37, 40, 97, 0.2);">
               Access Your Dashboard
            </a>
          </div>
        </div>

        <div style="background: #f4f4f9; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;">
          <p style="margin: 0;">This is an automated message from Gonza Systems. Please do not reply directly to this email.</p>
          <p style="margin: 10px 0 0;">&copy; 2026 Gonza Systems. High-performance retail management.</p>
        </div>
      </div>
    `,
  };

  try {
    const apiEndpoint =
      provider === "smtp" ? "/api/email/smtp" : "/api/email/resend";
    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}${apiEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await response.json();
  } catch (error: any) {
    console.error(`[Subscription Email Error]:`, error);
    return { success: false, error: error.message };
  }
}
