/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Zap, TrendingUp, ShieldCheck, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
      className="lp-grid-bg relative overflow-hidden"
      style={{
        padding: "clamp(64px,8vw,120px) clamp(16px,4vw,48px)",
      }}>
      {/* Background Decorative Blob */}
      <div
        className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] md:w-[450px] md:h-[450px] pointer-events-none opacity-50"
        style={{
          background: `radial-gradient(circle, rgba(240,90,43,0.12) 0%, transparent 70%)`,
        }}
      />

      <div
        className="mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
        style={{ maxWidth: 1150 }}>
        
        {/* Visual / Image Container */}
        <div
          className={cn(
            "lp-reveal transition-all duration-700 order-2 lg:order-1",
            visible ? "visible translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}>
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border bg-white/5 backdrop-blur-sm"
            style={{ borderColor: B.border }}>
            
            {/* Browser-style decorative top bar */}
            <div
              className="px-4 py-3 flex items-center gap-2 border-b"
              style={{ background: B.bgSurface, borderColor: B.border }}>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div
                className="flex-1 h-6 rounded-md border flex items-center px-3 ml-2"
                style={{ background: B.bgMid, borderColor: B.border }}>
                <span className="text-[10px] truncate" style={{ color: B.textDim }}>
                  gonzasales.com/dashboard
                </span>
              </div>
            </div>

            {/* 🚀 FIXED: Added aspect-ratio to ensure the 'fill' image has a parent height */}
            <div className="relative aspect-[16/10] sm:aspect-video lg:aspect-[16/11] w-full">
              <Image
                fill
                priority={false}
                src="/banners/b1.png"
                alt="Gonza business dashboard"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                className="object-cover object-top"
              />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div
          className={cn(
            "lp-reveal transition-all duration-700 delay-150 order-1 lg:order-2",
            visible ? "visible translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}>
          <div className="lp-section-label mb-4">
            Why Gonza
          </div>
          <h2
            className="font-extrabold tracking-tight mb-6"
            style={{
              fontSize: "clamp(30px, 4vw, 48px)",
              lineHeight: 1.1,
              color: B.text,
            }}>
            Focus on growth.
            <br />
            <span className="font-normal" style={{ color: B.textMuted }}>
              We handle the rest.
            </span>
          </h2>
          <p
            className="text-base md:text-lg mb-8"
            style={{
              color: B.textMuted,
              lineHeight: 1.7,
            }}>
            Stop wrestling with spreadsheets. Gonza automates the tedious parts
            of running a business so you can focus on what actually matters —
            your customers and your growth.
          </p>
          
          <ul className="list-none p-0 m-0 mb-10 flex flex-col gap-5">
            {points.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                className={cn(
                  "flex items-start gap-4 transition-all duration-500",
                  visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                )}
                style={{ transitionDelay: `${300 + i * 100}ms` }}>
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm"
                  style={{ 
                    background: `rgba(37,40,97,0.05)`, 
                    borderColor: `rgba(128,206,215,0.2)` 
                  }}>
                  <Icon size={18} className="text-primary" />
                </div>
                <span
                  className="text-sm md:text-base pt-1.5"
                  style={{
                    color: B.textMuted,
                    lineHeight: 1.5,
                  }}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
          
          <div className="flex flex-wrap gap-4">
            <Link href="/signup" className="lp-btn-primary inline-flex items-center gap-2">
              Start your free trial <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhySection;
