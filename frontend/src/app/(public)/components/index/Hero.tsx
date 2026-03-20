/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ArrowRight, ChevronRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

const Hero = ({ B }: { B: any }) => {
  const { user, status } = useAuth();

  return (
    <section
      className="lp-grid-bg"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 120,
        paddingBottom: 80,
        overflow: "hidden",
      }}>
      {/* Background glow blobs */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "10%",
          width: 500,
          height: 500,
          background: `radial-gradient(circle, rgba(37,40,97,0.5) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          width: 400,
          height: 400,
          background: `radial-gradient(circle, rgba(240,90,43,0.12) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 700,
          height: 400,
          background: `radial-gradient(ellipse, rgba(37,40,97,0.3) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: 760,
          padding: "0 20px",
          width: "100%",
        }}>
        {/* Badge */}
        <div
          className="lp-badge lp-fade-in"
          style={{ animationDelay: "0.1s", opacity: 0, marginBottom: 32 }}>
          <span
            className="lp-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#4ade80",
              display: "inline-block",
            }}
          />
          Built for African businesses
          <ChevronRight size={12} opacity={0.6} />
        </div>

        {/* Headline */}
        <h1
          className="lp-fade-up"
          style={{
            fontSize: "clamp(36px, 6vw, 68px)",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            marginBottom: 24,
            animationDelay: "0.2s",
            opacity: 0,
            color: B.text,
          }}>
          Business management
          <br />
          <span className="lp-shimmer-text">at the speed of light.</span>
        </h1>

        {/* Sub */}
        <p
          className="lp-fade-up"
          style={{
            fontSize: "clamp(15px, 2vw, 18px)",
            color: B.textMuted,
            lineHeight: 1.65,
            maxWidth: 560,
            margin: "0 auto 40px",
            animationDelay: "0.32s",
            opacity: 0,
          }}>
          Track sales, profits &amp; expenses. Generate receipts, invoices &amp;
          quotes — from one powerful, cloud-based platform designed for how you
          work.
        </p>

        {/* CTA Buttons */}
        <div
          className="lp-fade-up"
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            animationDelay: "0.44s",
            opacity: 0,
          }}>
          {status === "loading" ? (
            <div className="w-48 h-12 bg-white/5 animate-pulse rounded-xl" />
          ) : user ? (
            <Link
              href="/agency"
              className="lp-btn-primary"
              style={{ padding: "14px 28px" }}>
              Go to Dashboard <LayoutDashboard size={18} className="ml-1" />
            </Link>
          ) : (
            <>
              <Link href="/public/signup" className="lp-btn-primary">
                Start for Free <ArrowRight size={15} />
              </Link>
              <Link href="/public/login" className="lp-btn-outline">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Trust line */}
        <p
          className="lp-fade-up"
          style={{
            marginTop: 20,
            fontSize: 12,
            color: B.textDim,
            animationDelay: "0.54s",
            opacity: 0,
          }}>
          No credit card required · Cloud-based · Instant setup
        </p>
      </div>

      {/* Bottom fade */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: `linear-gradient(to top, ${B.bg}, transparent)`,
          pointerEvents: "none",
        }}
      />
    </section>
  );
};

export default Hero;
