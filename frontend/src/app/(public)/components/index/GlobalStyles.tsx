import { B } from "../../public/constants";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    .lp { font-family: 'Inter', sans-serif; background: ${B.bg}; color: ${B.text}; }
    .lp *, .lp *::before, .lp *::after { box-sizing: border-box; }

    /* ── Animations ── */
    @keyframes lp-fade-up {
      from { opacity: 0; transform: translateY(28px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    @keyframes lp-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes lp-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    @keyframes lp-float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50%       { transform: translateY(-10px) rotate(1deg); }
    }
    @keyframes lp-spin-slow {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes lp-pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.4; transform: scale(0.8); }
    }
    @keyframes lp-reveal {
      from { clip-path: inset(0 100% 0 0); }
      to   { clip-path: inset(0 0% 0 0);   }
    }

    .lp-fade-up   { animation: lp-fade-up  0.7s cubic-bezier(0.22,1,0.36,1) forwards; }
    .lp-fade-in   { animation: lp-fade-in  0.6s ease forwards; }
    .lp-float     { animation: lp-float    5s ease-in-out infinite; }

    .lp-shimmer-text {
      background: linear-gradient(90deg, ${B.text} 20%, ${B.secondary} 50%, ${B.accent} 65%, ${B.text} 80%);
      background-size: 250% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: lp-shimmer 4s linear infinite;
    }

    /* ── Grid overlay ── */
    .lp-grid-bg {
      background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 64px 64px;
    }

    /* ── Glow ── */
    .lp-glow-primary  { box-shadow: 0 0 80px rgba(37,40,97,0.6); }
    .lp-glow-orange   { box-shadow: 0 0 60px rgba(240,90,43,0.25); }

    /* ── Cards ── */
    .lp-card {
      background: ${B.bgSurface};
      border: 1px solid ${B.border};
      transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }
    .lp-card:hover {
      border-color: ${B.borderHover};
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
    }

    /* ── Buttons ── */
    .lp-btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      background: ${B.secondary};
      color: #fff;
      font-weight: 600; font-size: 14px;
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
      text-decoration: none;
      white-space: nowrap;
    }
    .lp-btn-primary:hover {
      background: #d94e22;
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(240,90,43,0.35);
    }
    .lp-btn-ghost {
      display: inline-flex; align-items: center; gap: 6px;
      background: transparent;
      color: rgba(240,240,245,0.65);
      font-weight: 500; font-size: 14px;
      padding: 10px 18px;
      border-radius: 7px;
      border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
      text-decoration: none;
    }
    .lp-btn-ghost:hover {
      background: rgba(255,255,255,0.06);
      color: ${B.text};
      border-color: rgba(255,255,255,0.18);
    }
    .lp-btn-outline {
      display: inline-flex; align-items: center; gap: 8px;
      background: transparent;
      color: ${B.text};
      font-weight: 600; font-size: 14px;
      padding: 12px 24px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.15);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
      text-decoration: none;
    }
    .lp-btn-outline:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(255,255,255,0.28);
      transform: translateY(-1px);
    }

    /* ── Badge ── */
    .lp-badge {
      display: inline-flex; align-items: center; gap: 7px;
      background: rgba(37,40,97,0.5);
      border: 1px solid rgba(128,206,215,0.2);
      border-radius: 999px;
      padding: 5px 14px;
      font-size: 12px;
      color: ${B.accent};
      letter-spacing: 0.02em;
    }

    /* ── Section label ── */
    .lp-section-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${B.secondary};
    }

    /* ── Mockup float shadow ── */
    .lp-mockup-shadow {
      filter: drop-shadow(0 40px 80px rgba(0,0,0,0.7)) drop-shadow(0 0 40px rgba(37,40,97,0.4));
    }

    /* ── Divider ── */
    .lp-h-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent); }

    /* ── Feature icon ── */
    .lp-feat-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(37,40,97,0.6);
      border: 1px solid rgba(128,206,215,0.15);
      transition: transform 0.3s cubic-bezier(.34,1.56,.64,1);
    }
    .lp-card:hover .lp-feat-icon { transform: scale(1.12) rotate(-4deg); }

    /* ── Contact hover ── */
    .lp-contact-card { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
    .lp-contact-card:hover { transform: translateY(-4px); }

    /* ── Nav ── */
    .lp-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      transition: background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease;
    }
    .lp-nav-blur {
      background: rgba(13,14,26,0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    /* ── Stats ── */
    .lp-stat-num {
      background: linear-gradient(135deg, ${B.text} 30%, ${B.accent});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ── Pulse dot ── */
    .lp-dot { animation: lp-pulse-dot 2s ease-in-out infinite; }

    /* ── Scroll-reveal utility ── */
    .lp-reveal {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1);
    }
    .lp-reveal.visible { opacity: 1; transform: translateY(0); }

    /* ── Image mockup glow ring ── */
    .lp-ring {
      position: absolute; inset: -2px;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(240,90,43,0.3), rgba(128,206,215,0.2));
      z-index: -1;
      filter: blur(30px);
    }

    @media (max-width: 640px) {
      .lp-btn-primary, .lp-btn-outline { padding: 11px 18px; font-size: 13px; }
    }
  `}</style>
);

export default GlobalStyles;
