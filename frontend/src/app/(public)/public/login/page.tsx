import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LoginLogo } from "../../components/login/LoginLogo";
import { LoginForm } from "../../components/login/LoginForm";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Login | Gonza Systems",
  description: "Sign in to your account to continue",
};

export default function LoginPage() {
  return (
    <div className="bg-[#0b1326] text-[#dae2fd] min-h-screen flex antialiased">
      {/* Left Side: Functional UI Canvas */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 lg:px-20 py-12 relative z-10 bg-[#0b1326]">
        <div className="w-full max-w-[420px] flex flex-col gap-8">
          {/* Header Section */}
          <div className="flex flex-col gap-2 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <LoginLogo />
            </div>
            <h1 className="text-[32px] font-bold text-white mb-2">Welcome back</h1>
            <p className="text-[15px] text-[#908fa0]">
              Sign in to your account to continue and manage your business.
            </p>
          </div>

          {/* Form Section - Maintained current LoginForm formatting */}
          <div className="w-full">
            <LoginForm isDark={true} />
          </div>
        </div>
      </div>

      {/* Right Side: Immersive Imagery Canvas (Hidden on Mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[radial-gradient(circle_at_70%_30%,#2f3aa3_0%,#0b1326_100%)] border-l border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0b1326] to-transparent z-10 opacity-40 mix-blend-multiply"></div>
        
        {/* Banner Image b4.png used for high quality immersion */}
        <Image 
          src="/banners/b4.png" 
          alt="Gonza Systems Background" 
          fill
          priority
          className="object-cover opacity-40 mix-blend-overlay z-0"
        />

        {/* Floating Glass UI Element from Sample */}
        <div className="absolute bottom-[48px] left-[48px] right-[48px] z-20">
          <div className="bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-[16px] p-6 max-w-[360px]">
            <div className="inline-flex items-center justify-center bg-primary/20 rounded-[6px] px-2 py-1 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary mr-2" />
              <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.5px]">Enterprise Grade Security</span>
            </div>
            <p className="text-[14px] text-[#c7c4d7] leading-[1.5]">
              Secure access to your sales and inventory data. Monitored 24/7 with zero-trust architecture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
