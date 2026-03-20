/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Phone, Mail } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const ContactSection = ({ B }: { B: any }) => {
  const { ref, visible } = useReveal();
  return (
    <section
      ref={ref}
      style={{
        padding: "clamp(64px,8vw,120px) clamp(16px,4vw,48px)",
        background: B.bgMid,
        position: "relative",
      }}>
      <div
        className="lp-h-divider"
        style={{ position: "absolute", top: 0, left: "10%", right: "10%" }}
      />

      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <div
          className={`lp-reveal ${visible ? "visible" : ""}`}
          style={{ marginBottom: 48 }}>
          <div className="lp-section-label" style={{ marginBottom: 16 }}>
            Contact
          </div>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,40px)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: B.text,
              marginBottom: 14,
            }}>
            We&apos;re here to help
          </h2>
          <p
            style={{
              fontSize: 15,
              color: B.textMuted,
              lineHeight: 1.7,
              maxWidth: 480,
              margin: "0 auto",
            }}>
            Have a question, need a demo, or want to discuss pricing? Reach out
            — our team responds fast.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}>
          {/* Phone */}
          <a
            href="tel:0758519696"
            className={`lp-contact-card lp-card lp-reveal ${
              visible ? "visible" : ""
            }`}
            style={{
              padding: "28px 24px",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              gap: 18,
              textDecoration: "none",
              transitionDelay: "100ms",
            }}
            onMouseEnter={(e) => {
              (
                e.currentTarget as HTMLElement
              ).style.borderColor = `rgba(240,90,43,0.4)`;
              (
                e.currentTarget as HTMLElement
              ).style.boxShadow = `0 8px 32px rgba(240,90,43,0.15)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = B.border;
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}>
            <div
              style={{
                flexShrink: 0,
                width: 48,
                height: 48,
                borderRadius: 12,
                background: B.secondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(240,90,43,0.35)",
              }}>
              <Phone size={20} color="#fff" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: B.textDim,
                  marginBottom: 4,
                }}>
                Phone / WhatsApp
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: B.text }}>
                0758 519 696
              </div>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:gonzasystems@gmail.com"
            className={`lp-contact-card lp-card lp-reveal ${
              visible ? "visible" : ""
            }`}
            style={{
              padding: "28px 24px",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              gap: 18,
              textDecoration: "none",
              transitionDelay: "200ms",
            }}
            onMouseEnter={(e) => {
              (
                e.currentTarget as HTMLElement
              ).style.borderColor = `rgba(128,206,215,0.3)`;
              (
                e.currentTarget as HTMLElement
              ).style.boxShadow = `0 8px 32px rgba(128,206,215,0.1)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = B.border;
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}>
            <div
              style={{
                flexShrink: 0,
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `rgba(128,206,215,0.15)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid rgba(128,206,215,0.25)`,
              }}>
              <Mail size={20} color={B.accent} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: B.textDim,
                  marginBottom: 4,
                }}>
                Email
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: B.text }}>
                gonzasystems@gmail.com
              </div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
