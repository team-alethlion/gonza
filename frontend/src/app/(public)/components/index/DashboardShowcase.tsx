/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useReveal } from "@/hooks/useReveal";
import Image from "next/image";

const DashboardShowcase = ({ B }: { B: any }) => {
  const { ref, visible } = useReveal(0.05);
  return (
    <section
      ref={ref}
      style={{
        position: "relative",
        background: B.bg,
        overflow: "hidden",
        paddingBottom: "clamp(48px,7vw,96px)",
      }}>
      {/* Ambient glows */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 400,
          background: `radial-gradient(ellipse, rgba(37,40,97,0.55) 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "15%",
          width: 320,
          height: 320,
          background: `radial-gradient(circle, rgba(240,90,43,0.1) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "30%",
          right: "10%",
          width: 280,
          height: 280,
          background: `radial-gradient(circle, rgba(128,206,215,0.07) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        className={`lp-reveal ${visible ? "visible" : ""}`}
        style={{
          maxWidth: 1020,
          margin: "0 auto",
          padding: "0 clamp(16px,4vw,40px)",
          position: "relative",
          zIndex: 1,
        }}>
        {/* Browser chrome frame */}
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid rgba(255,255,255,0.1)`,
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.04),
              0 32px 80px rgba(0,0,0,0.6),
              0 0 60px rgba(37,40,97,0.4),
              0 0 0 0.5px rgba(128,206,215,0.1)
            `,
          }}>
          {/* Browser top bar */}
          <div
            style={{
              background: "rgba(20,22,42,0.98)",
              padding: "11px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderBottom: `1px solid rgba(255,255,255,0.07)`,
            }}>
            {/* Traffic lights */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {["#ff5f57", "#ffbd2e", "#28c840"].map((c) => (
                <div
                  key={c}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: c,
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>
            {/* URL bar */}
            <div
              style={{
                flex: 1,
                maxWidth: 340,
                margin: "0 auto",
                height: 24,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#4ade80",
                  opacity: 0.8,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(240,240,245,0.35)",
                  letterSpacing: "0.01em",
                }}>
                gonzasystems.com
              </span>
            </div>
            {/* Spacer for traffic lights symmetry */}
            <div style={{ width: 50, flexShrink: 0 }} />
          </div>

          {/* Product image */}
          <div style={{ position: "relative", lineHeight: 0 }}>
            <div className="w-full overflow-hidden rounded-xl shadow-2xl bg-muted/30">
              <Image
                src="/lovable-uploads/GDG.png"
                alt="Gonza Systems — dashboard on desktop and mobile"
                width={2480}
                height={2044}
                className="w-full h-auto block"
                priority
                quality={90}
                sizes="100vw"
              />
            </div>
            {/* Subtle bottom gradient so it fades into page */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 60,
                background: `linear-gradient(to top, rgba(13,14,26,0.6), transparent)`,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        {/* Annotation strip below the frame */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "clamp(20px,4vw,56px)",
            flexWrap: "wrap",
            marginTop: 32,
          }}>
          {[
            { label: "Desktop app", dot: B.accent },
            { label: "Mobile app", dot: B.secondary },
            { label: "Real-time sync", dot: "#4ade80" },
          ].map(({ label, dot }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: dot,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(240,240,245,0.4)",
                  letterSpacing: "0.02em",
                }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DashboardShowcase;
