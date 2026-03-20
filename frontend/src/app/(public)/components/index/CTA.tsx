/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { CheckCircle2, ArrowRight, Phone, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { useAuth } from "@/components/auth/AuthProvider";

const CTA = ({ B }: { B: any }) => {
  const { ref, visible } = useReveal();
  const { user, status } = useAuth();

  return (
    <section
      ref={ref}
      style={{
        padding: "clamp(64px,8vw,120px) clamp(16px,4vw,48px)",
        background: B.bg,
      }}>
      <div
        className={`lp-reveal ${visible ? "visible" : ""}`}
        style={{
          maxWidth: 900,
          margin: "0 auto",
          borderRadius: 24,
          overflow: "hidden",
          position: "relative",
          padding: "clamp(48px,7vw,96px) clamp(24px,5vw,80px)",
          textAlign: "center",
          background: `linear-gradient(135deg, ${B.primary} 0%, #1a1c3e 50%, #0d0e1a 100%)`,
          border: `1px solid rgba(128,206,215,0.12)`,
        }}>
        {/* Grid bg */}
        <div
          className="lp-grid-bg"
          style={{ position: "absolute", inset: 0, opacity: 0.6 }}
        />
        {/* Glows */}
        <div
          style={{
            position: "absolute",
            top: "-40%",
            right: "10%",
            width: 350,
            height: 350,
            background: `radial-gradient(circle, rgba(240,90,43,0.18) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30%",
            left: "5%",
            width: 300,
            height: 300,
            background: `radial-gradient(circle, rgba(128,206,215,0.12) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(240,90,43,0.12)",
              border: "1px solid rgba(240,90,43,0.25)",
              borderRadius: 999,
              padding: "4px 14px",
              fontSize: 12,
              color: B.secondary,
              marginBottom: 28,
            }}>
            <CheckCircle2 size={12} /> No credit card required
          </div>
          <h2
            style={{
              fontSize: "clamp(28px,5vw,52px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: B.text,
              lineHeight: 1.06,
              marginBottom: 20,
            }}>
            Ready to transform
            <br />
            your business?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: B.textMuted,
              lineHeight: 1.6,
              maxWidth: 460,
              margin: "0 auto 40px",
            }}>
            Join hundreds of businesses already running smarter with Gonza
            Systems.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}>
            {status === "loading" ? (
              <div className="w-48 h-12 bg-white/10 animate-pulse rounded-xl" />
            ) : user ? (
              <Link
                href="/agency"
                className="lp-btn-primary"
                style={{ fontSize: 15, padding: "14px 28px" }}>
                Go to Dashboard <LayoutDashboard size={16} className="ml-1" />
              </Link>
            ) : (
              <Link
                href="/public/signup"
                className="lp-btn-primary"
                style={{ fontSize: 15, padding: "14px 28px" }}>
                Sign Up for Free <ArrowRight size={16} />
              </Link>
            )}
            <a
              href="tel:0758519696"
              className="lp-btn-outline"
              style={{ fontSize: 15, padding: "14px 28px" }}>
              <Phone size={15} /> Call 0758 519 696
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
