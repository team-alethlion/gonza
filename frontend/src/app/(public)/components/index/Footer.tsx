/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { Phone } from "lucide-react";
import Image from "next/image";

const Footer = ({ B }: { B: any }) => (
  <footer
    style={{
      background: "#070810",
      borderTop: `1px solid ${B.border}`,
      padding: "clamp(32px,5vw,48px) clamp(16px,4vw,48px)",
    }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/" className="flex items-center">
            <Image
              width={32}
              height={32}
              src="/lovable-uploads/logo sys white-01.png"
              alt="Gonza Logo"
              className="h-8 md:h-10"
            />
          </Link>
          <p style={{ fontSize: 12, color: B.textDim, marginTop: 4 }}>
            © {new Date().getFullYear()} Gonza Systems. All rights reserved.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            alignItems: "center",
          }}>
          <Link
            href="/public/privacy-policy"
            style={{
              fontSize: 13,
              color: B.textMuted,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            /* We avoid onMouseEnter/onMouseLeave inline for server components if possible, 
               but here we keep it for now as it's a simple property access. 
               Better would be CSS classes. */
          >
            Privacy Policy
          </Link>
          <a
            href="tel:0758519696"
            style={{
              fontSize: 13,
              color: B.textMuted,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "color 0.2s",
            }}>
            <Phone size={13} /> 0758 519 696
          </a>
          <Link
            href="/login"
            style={{
              fontSize: 13,
              color: B.textMuted,
              textDecoration: "none",
              transition: "color 0.2s",
            }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
