import { NextResponse } from "next/server";

export const agencyProxy = (auth: any, nextUrl: any) => {
  const role = (auth?.user as any)?.role?.toLowerCase();
  
  // PIN Bypass for Admin (Agency Owner) and Owner roles
  // Admin role in session means the user has administrative privileges for the agency
  if (role === 'admin' || role === 'owner') {
    return true;
  }

  // General Access for other roles
  if (['manager', 'supervisor', 'staff'].includes(role)) {
    // Protect specific admin-only sub-paths (e.g., Business Management)
    const isAdminOnlyPath = nextUrl.pathname.startsWith("/agency/business-management")
    if (isAdminOnlyPath && role !== 'admin') {
      return NextResponse.redirect(new URL("/agency", nextUrl))
    }
    
    // Future: PIN verification cookie check can be added here
    // const pinVerified = nextUrl.cookies.get('profile_pin_verified')?.value === 'true';
    // if (!pinVerified && !nextUrl.pathname.includes('/profiles')) {
    //   return NextResponse.redirect(new URL('/agency/profiles', nextUrl));
    // }

    return true;
  }
  
  return NextResponse.redirect(new URL("/login", nextUrl));
};
