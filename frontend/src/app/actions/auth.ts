"use server";

import { djangoFetch } from "@/lib/django-client";
import { auth } from "@/auth";

export async function signInAction(email: string, password: string) {
  const startTime = Date.now();
  console.log(`[PERF] signInAction starting for ${email}`);
  try {
    // In next-auth, the credentials provider already hits Django for a token.
    // However, if the frontend strictly calls this to test credentials manually, we can test auth locally:
    const res = await fetch(`${process.env.NEXT_PUBLIC_DJANGO_API_URL}auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    console.log(`[PERF] signInAction api auth took ${Date.now() - startTime}ms`);

    if (!res.ok) {
      return { success: false, error: "Invalid email or password" };
    }
    
    // We mock success and direct to next-auth signIn client-side instead of returning full NextAuth user.
    // Alternatively, this file might just be used for generic auth actions.
    const data = await res.json();
    return {
      success: true,
      user: {
        email: email,
        token: data.access,
      },
    };
  } catch (error: any) {
    console.error("Error in signInAction:", error);
    return { success: false, error: error.message || "Failed to sign in" };
  }
}

export async function resetPasswordAction(newPassword: string, resetToken?: string) {
  try {
    if (!resetToken) {
      return { success: false, error: "Reset token is missing or invalid" };
    }

    const result = await djangoFetch('users/users/reset_password/', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword })
    });

    if (result && result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return { success: false, error: error.message || "Failed to reset password" };
  }
}

export async function generatePasswordResetToken(email: string) {
  try {
    const result = await djangoFetch('users/users/request_reset/', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    return { success: true, token: result.token }; // Returning token for demo/testing, but in production, just return success
  } catch (error: any) {
    console.error("Error generating reset token:", error);
    return { success: false, error: error.message };
  }
}

export async function signOutAction() {
  console.log(
    "signOutAction called. If using NextAuth, call client-side signOut() instead.",
  );
  return { success: true };
}

export async function updateUserBranchAction(userId: string, branchId: string) {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");

  try {
    const result = await djangoFetch(`users/users/${userId}/update_branch/`, {
      method: 'POST',
      body: JSON.stringify({ branchId })
    });

    if (result && result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error updating user branch:", error);
    return { success: false, error: error.message };
  }
}
