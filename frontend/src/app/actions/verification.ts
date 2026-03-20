"use server";

import { djangoFetch } from "@/lib/django-client";

/**
 * Validates email availability and sends an OTP.
 */
export async function initiateSignupAction(email: string) {
  try {
    const result = await djangoFetch('users/users/initiate_signup/', {
        method: 'POST',
        body: JSON.stringify({ email })
    });

    if (result && result.error) {
        return { success: false, error: result.error };
    }

    return { 
      success: true, 
      message: "Verification code sent to your email."
    };
  } catch (error: any) {
    console.error("Error in initiateSignupAction:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

/**
 * Verifies the OTP and creates the Agency, User, and Branch.
 */
export async function verifyAndCreateAccountAction(data: any) {
  try {
    const result = await djangoFetch('users/users/verify_signup/', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (result && result.error) {
        return { success: false, error: result.error };
    }

    return { 
      success: true, 
      user: { 
        id: result.user.id, 
        email: result.user.email,
        name: result.user.name,
        role: result.user.role || 'admin',
        agency: result.user.agency
      } 
    };
  } catch (error: any) {
    console.error("Error in verifyAndCreateAccountAction:", error);
    return { success: false, error: error.message || "Failed to complete signup." };
  }
}
