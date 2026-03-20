/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  BarChart3,
  Users,
  Cloud,
  Receipt,
  FileText,
  Package,
  TrendingUp,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const featureList = [
  {
    icon: Receipt,
    title: "Sales & Receipts",
    desc: "Record every transaction and generate professional receipts instantly — no paperwork.",
  },
  {
    icon: FileText,
    title: "Invoices & Quotes",
    desc: "Send polished invoices and quotations to clients in a few taps.",
  },
  {
    icon: BarChart3,
    title: "Profit Analytics",
    desc: "Crystal-clear financial insights with real-time charts and reports.",
  },
  {
    icon: Users,
    title: "Customer Management",
    desc: "Rich customer profiles, purchase history, and relationship tracking.",
  },
  {
    icon: Package,
    title: "Inventory Control",
    desc: "Monitor stock levels, get low-stock alerts, and avoid over-ordering.",
  },
  {
    icon: Cloud,
    title: "Cloud-Based Access",
    desc: "Your data secure in the cloud — accessible from any device, anywhere.",
  },
  {
    icon: TrendingUp,
    title: "Expense Tracking",
    desc: "Log expenses with categories and understand where your money goes.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    desc: "Encrypted data storage with role-based access control for your team.",
  },
  {
    icon: Zap,
    title: "Instant Documents",
    desc: "PDF receipts, invoices, and quotes in one tap — share via WhatsApp or email.",
  },
];

const Features = ({ B }: { B: any }) => {
  const { ref, visible } = useReveal();
  return (
    <section
      ref={ref}
      style={{
        padding: "clamp(64px,8vw,120px) clamp(16px,4vw,48px)",
        background: B.bgMid,
      }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          className={`lp-reveal ${visible ? "visible" : ""}`}
          style={{ maxWidth: 560, marginBottom: 64 }}>
          <div className="lp-section-label" style={{ marginBottom: 16 }}>
            Features
          </div>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,42px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: B.text,
              marginBottom: 16,
            }}>
            Everything you need.
            <br />
            Nothing you don&apos;t.
          </h2>
          <p style={{ fontSize: 15, color: B.textMuted, lineHeight: 1.7 }}>
            A complete business management platform built for the pace of
            African commerce.
          </p>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 1,
            border: `1px solid ${B.border}`,
            borderRadius: 16,
            overflow: "hidden",
          }}>
          {featureList.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`lp-card lp-reveal ${visible ? "visible" : ""}`}
                style={{
                  padding: "28px 28px",
                  borderRadius: 0,
                  border: "none",
                  borderRight: `1px solid ${B.border}`,
                  borderBottom: `1px solid ${B.border}`,
                  transitionDelay: `${i * 60}ms`,
                }}>
                <div className="lp-feat-icon" style={{ marginBottom: 16 }}>
                  <Icon size={18} color={B.accent} />
                </div>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: B.text,
                    marginBottom: 8,
                  }}>
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: B.textMuted,
                    lineHeight: 1.65,
                  }}>
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
