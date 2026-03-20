/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";

const AppShowcase = ({ B }: { B: any }) => {
  const { ref, visible } = useReveal();
  return (
    <section
      ref={ref}
      className="lp-grid-bg"
      style={{
        padding: "clamp(64px,8vw,120px) clamp(16px,4vw,48px)",
        overflow: "hidden",
        position: "relative",
      }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "60%",
          width: 500,
          height: 500,
          background: `radial-gradient(circle, rgba(37,40,97,0.35) 0%, transparent 70%)`,
          pointerEvents: "none",
          transform: "translateY(-50%)",
        }}
      />

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 60,
          alignItems: "center",
        }}>
        {/* Text */}
        <div className={`lp-reveal ${visible ? "visible" : ""}`}>
          <div className="lp-section-label" style={{ marginBottom: 16 }}>
            Mobile App
          </div>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,42px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              marginBottom: 20,
              color: B.text,
            }}>
            Your entire business,
            <br />
            in your pocket.
          </h2>
          <p
            style={{
              fontSize: 15,
              color: B.textMuted,
              lineHeight: 1.7,
              marginBottom: 32,
              maxWidth: 440,
            }}>
            The Gonza mobile app puts sales tracking, inventory management, and
            instant document generation right at your fingertips — whether
            you&apos;re at the office or in the field.
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 36px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}>
            {[
              "Record a sale in under 10 seconds",
              "Generate receipts, invoices & quotes instantly",
              "View real-time profit & expense analytics",
              "Works on any Android or iOS device",
            ].map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontSize: 14,
                  color: B.textMuted,
                }}>
                <CheckCircle2
                  size={16}
                  color={B.secondary}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="lp-btn-primary">
            Try it free <ArrowRight size={15} />
          </Link>
        </div>

        {/* Phone image */}
        <div
          className={`lp-reveal ${visible ? "visible" : ""}`}
          style={{
            transitionDelay: "150ms",
            display: "flex",
            justifyContent: "center",
          }}>
          <div style={{ position: "relative", maxWidth: 380 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(ellipse at center, rgba(240,90,43,0.15) 0%, transparent 70%)`,
                borderRadius: 40,
                filter: "blur(40px)",
              }}
            />
            <img
              src="/lovable-uploads/hand.png"
              alt="Gonza app on iPhone"
              className="lp-mockup-shadow lp-float"
              style={{
                width: "100%",
                height: "auto",
                position: "relative",
                zIndex: 1,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "/lovable-uploads/8e29fee9-be61-482c-b1e8-5288d0d66003.png";
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppShowcase;
