/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useReveal } from "@/hooks/useReveal";

const StatsBar = ({ B }: { B: any }) => {
  const { ref, visible } = useReveal();
  const stats = [
    { value: "500+", label: "Businesses served" },
    { value: "KES · UGX", label: "Multi-currency support" },
    { value: "99.9%", label: "Uptime guaranteed" },
    { value: "< 1 min", label: "Setup time" },
  ];
  return (
    <div
      ref={ref}
      style={{
        borderTop: `1px solid ${B.border}`,
        borderBottom: `1px solid ${B.border}`,
        background: B.bgMid,
      }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px clamp(16px,4vw,48px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 24,
          textAlign: "center",
        }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`lp-reveal ${visible ? "visible" : ""}`}
            style={{ transitionDelay: `${i * 80}ms` }}>
            <div
              className="lp-stat-num"
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: B.textMuted, marginTop: 6 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsBar;
