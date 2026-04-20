/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Zap, TrendingUp, ShieldCheck, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import Image from "next/image";

const WhySection = ({ B }: { B: any }) => {
  const { ref, visible } = useReveal();
  const points = [
    {
      icon: Zap,
      label: "Intuitive — zero training required, start in minutes.",
    },
    {
      icon: TrendingUp,
      label: "Smart analytics that surface insights automatically.",
    },
    { icon: ShieldCheck, label: "Bank-grade encryption keeps your data safe." },
    { icon: Star, label: "Dedicated support team based in your timezone." },
  ];

  return (
    <section
      ref={ref}
      className="lp-grid-bg"
      style={{
        padding: "clamp(64px,8vw,120px) clamp(16px,4vw,48px)",
        position: "relative",
        overflow: "hidden",
      }}>
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "5%",
          width: 350,
          height: 350,
          background: `radial-gradient(circle, rgba(240,90,43,0.08) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 80,
          alignItems: "center",
        }}>
        {/* Visual */}
        <div
          className={`lp-reveal ${visible ? "visible" : ""}`}
          style={{ order: 0 }}>
          <div
            style={{
              position: "relative",
              borderRadius: 20,
              overflow: "hidden",
              border: `1px solid ${B.border}`,
            }}>
            {/* Decorative top bar */}
            <div
              style={{
                background: B.bgSurface,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderBottom: `1px solid ${B.border}`,
              }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#ff5f57",
                }}
              />
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#ffbd2e",
                }}
              />
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#28c840",
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: 20,
                  background: B.bgMid,
                  borderRadius: 6,
                  border: `1px solid ${B.border}`,
                  marginLeft: 8,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 10,
                }}>
                <span style={{ fontSize: 10, color: B.textDim }}>
                  gonzasales.com/dashboard
                </span>
              </div>
            </div>
            <Image
              fill
              src="/lovable-uploads/5de523b3-1d7b-4772-9dd4-ba050fa3fba3.png"
              alt="Gonza business dashboard"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </div>

        {/* Text */}
        <div
          className={`lp-reveal ${visible ? "visible" : ""}`}
          style={{ transitionDelay: "150ms" }}>
          <div className="lp-section-label" style={{ marginBottom: 16 }}>
            Why Gonza
          </div>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,42px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: B.text,
              marginBottom: 20,
            }}>
            Focus on growth.
            <br />
            <span style={{ color: B.textMuted, fontWeight: 400 }}>
              We handle the rest.
            </span>
          </h2>
          <p
            style={{
              fontSize: 15,
              color: B.textMuted,
              lineHeight: 1.7,
              marginBottom: 36,
            }}>
            Stop wrestling with spreadsheets. Gonza automates the tedious parts
            of running a business so you can focus on what actually matters —
            your customers and your growth.
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 40px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}>
            {points.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                className={`lp-reveal ${visible ? "visible" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  transitionDelay: `${220 + i * 80}ms`,
                }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `rgba(37,40,97,0.6)`,
                    border: `1px solid rgba(128,206,215,0.15)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <Icon size={15} color={B.secondary} />
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: B.textMuted,
                    lineHeight: 1.5,
                    paddingTop: 7,
                  }}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/signup" className="lp-btn-primary">
            Start your free trial <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default WhySection;
