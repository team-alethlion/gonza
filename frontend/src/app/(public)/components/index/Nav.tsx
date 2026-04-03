"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import Image from "next/image";

const Nav = () => {
  const { user, status } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`lp-nav ${scrolled ? "lp-nav-blur" : ""}`}
      style={{ padding: "0 clamp(16px, 4vw, 48px)" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/" className="flex items-center">
            <Image
              width={32}
              height={32}
              src="/lovable-uploads/logo sys white-01.png"
              alt="Gonza Logo"
              className="h-8 md:h-10"
            />
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {status === "loading" ? (
            <div className="w-24 h-9 bg-slate-100/50 animate-pulse rounded-lg" />
          ) : user ? (
            <Link
              href="/agency"
              className="lp-btn-primary"
              style={{ fontSize: 13, padding: "9px 18px" }}>
              Dashboard <LayoutDashboard size={14} className="ml-1" />
            </Link>
          ) : (
            <>
              <Link
                href="/public/login"
                className="lp-btn-ghost"
                style={{ fontSize: 13 }}>
                Log In
              </Link>
              <Link
                href="/public/signup"
                className="lp-btn-primary"
                style={{ fontSize: 13, padding: "9px 18px" }}>
                Get Started <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Nav;
