/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  completeInitialOnboardingAction,
  getAccountStatusAction,
} from "@/app/actions/business-settings";
import { Label } from "@/components/ui/label";
import {
  Check,
  Loader2,
  ShieldAlert,
  Upload,
  LogOut,
  Layout,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

const BUSINESS_SIZES = [
  { value: "1-5", label: "1–5 People" },
  { value: "6-20", label: "6–20 People" },
  { value: "21-50", label: "21–50 People" },
  { value: "50+", label: "Over 50 People" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, signOut, updateSession, loading: authLoading } = useAuth();
  const { currentBusiness } = useBusiness();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);

  const [formData, setFormData] = useState({
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    businessEmail: user?.email || "",
    natureOfBusiness: "",
    businessSize: "",
    businessLogo: "",
    businessWebsite: "",
    currency: "UGX",
    taxRate: "0",
    userName: user?.name || "",
    userPhone: "",
    userPin: "",
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be smaller than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      updateForm({ businessLogo: base64 });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processImageFile(file);
    },
    [processImageFile],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    async function fetchAccountStatus() {
      if (user?.id) {
        const status = await getAccountStatusAction(user.id);
        setAccountStatus(status);
      }
    }
    fetchAccountStatus();
  }, [user?.id]);

  useEffect(() => {
    if (user?.isOnboarded || (user as any)?.agencyOnboarded) {
      router.replace("/agency");
    }
  }, [user?.isOnboarded, (user as any)?.agencyOnboarded, router]);

  const updateForm = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const validateStep1 = () => {
    if (
      !formData.businessName ||
      !formData.businessAddress ||
      !formData.businessPhone
    ) {
      toast.error(
        "Please fill in your business name, address, and contact number.",
      );
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.currency) {
      toast.error("Please select your preferred currency.");
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    if (!user?.id) {
      toast.error("Session expired. Please log in again.");
      return;
    }
    if (
      !formData.userName ||
      !formData.userPhone ||
      formData.userPin.length !== 4
    ) {
      toast.error("Complete your profile details and security PIN.");
      return;
    }

    setLoading(true);
    try {
      const subStatus =
        accountStatus?.subscription_status ||
        user?.subscriptionStatus ||
        "trial";
      const trialEndDate =
        accountStatus?.next_billing_date || user?.trialEndDate;
      const packageId = accountStatus?.package_id;

      const res = await completeInitialOnboardingAction({
        userId: user?.id,
        agencyId: user?.agencyId,
        branchId: currentBusiness?.id,
        businessName: formData.businessName,
        businessAddress: formData.businessAddress,
        businessPhone: formData.businessPhone,
        businessEmail: formData.businessEmail,
        businessLogo: formData.businessLogo,
        natureOfBusiness: formData.natureOfBusiness,
        businessSize: formData.businessSize,
        businessWebsite: formData.businessWebsite,
        currency: formData.currency,
        taxRate: parseFloat(formData.taxRate || "0"),
        userName: formData.userName,
        userPhone: formData.userPhone,
        userPin: formData.userPin,
        packageId: packageId,
        subscriptionStatus: subStatus,
        trialEndDate: trialEndDate,
      });

      if (res.success) {
        toast.success("Welcome aboard! Your setup is complete.");
        await updateSession({
          isOnboarded: true,
          agencyOnboarded: true,
          subscriptionStatus: subStatus,
        });
        router.replace("/agency");
      } else {
        toast.error(res.error || "Something went wrong during setup.");
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-gray-500 font-semibold animate-pulse">
            Setting up your firm...
          </p>
        </div>
      </div>
    );
  }

  const progress = ((currentStep - 1) / 3) * 100;

  return (
    <div className="isolate bg-white px-6 py-12 sm:py-24 lg:px-8 min-h-screen relative font-inter overflow-x-hidden">
      {/* Background blobs */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="relative left-1/2 -z-10 aspect-1155/678 w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#6366f1] to-[#a855f7] opacity-30 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem]"
        />
      </div>

      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Image
            height={32}
            width={32}
            src="/icon.png"
            alt="Gonza Logo"
            className="h-8 w-auto"
          />
          <button
            onClick={() => signOut()}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-balance text-gray-900 sm:text-5xl">
          {currentStep === 1
            ? "Configure your business"
            : currentStep === 2
            ? "System Preferences"
            : "Personalize your profile"}
        </h2>
        <p className="mt-2 text-lg/8 text-gray-600">
          {currentStep === 1
            ? "Complete these basic details to finalize your agency setup and enter the system."
            : currentStep === 2
            ? "Configure how the system should handle finances and identity for your new agency."
            : "Establish your administrative identity and secure your dashboard access."}
        </p>
      </div>

      {/* Progress Line */}
      <div className="mx-auto mt-12 max-w-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Step {currentStep} of 3
          </span>
          <span className="text-xs font-semibold text-gray-500">
            {Math.round(((currentStep - 1) / 3) * 100)}% complete
          </span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-xl sm:mt-16">
        {/* STEP 1: BUSINESS SETUP */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {accountStatus?.is_trial && (
              <div className="sm:col-span-2 p-4 bg-indigo-50 border border-indigo-100 rounded-md flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <p className="text-sm text-indigo-900 leading-relaxed">
                  <span className="font-semibold">
                    Free Trial Protocol Active.
                  </span>{" "}
                  During your evaluation, you can explore all features with a
                  limit of 1 business location.
                </p>
              </div>
            )}

            <div className="sm:col-span-2">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-8 rounded-md border border-dashed transition-all duration-200 ${
                  isDragging
                    ? "border-primary bg-indigo-50/50"
                    : "border-gray-300 bg-gray-50/50"
                }`}>
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                    {logoPreview ? (
                      <Image
                        fill
                        src={logoPreview}
                        alt="Preview"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <Layout className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-md shadow-sm hover:bg-indigo-500 transition-colors">
                    <Upload className="w-4 h-4" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processImageFile(file);
                    }}
                  />
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-gray-900">
                    Firm Logo
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to 2MB. Appears on receipts.
                  </p>
                  {logoPreview && (
                    <button
                      onClick={() => {
                        setLogoPreview(null);
                        updateForm({ businessLogo: "" });
                      }}
                      className="text-xs font-semibold text-red-600 mt-2 hover:text-red-500">
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label
                htmlFor="business-name"
                className="block text-sm/6 font-semibold text-gray-900">
                Business Name
              </Label>
              <div className="mt-2.5">
                <input
                  id="business-name"
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => updateForm({ businessName: e.target.value })}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  placeholder="e.g. Gonza Global Ltd"
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="business-phone"
                className="block text-sm/6 font-semibold text-gray-900">
                Phone Number
              </Label>
              <div className="mt-2.5">
                <input
                  id="business-phone"
                  type="text"
                  value={formData.businessPhone}
                  onChange={(e) =>
                    updateForm({ businessPhone: e.target.value })
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  placeholder="+256..."
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="business-type"
                className="block text-sm/6 font-semibold text-gray-900">
                Business Type
              </Label>
              <div className="mt-2.5">
                <input
                  id="business-type"
                  type="text"
                  value={formData.natureOfBusiness}
                  onChange={(e) =>
                    updateForm({ natureOfBusiness: e.target.value })
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  placeholder="e.g. Retail, Trading"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label
                htmlFor="address"
                className="block text-sm/6 font-semibold text-gray-900">
                Address
              </Label>
              <div className="mt-2.5">
                <input
                  id="address"
                  type="text"
                  value={formData.businessAddress}
                  onChange={(e) =>
                    updateForm({ businessAddress: e.target.value })
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  placeholder="City, Street, Building"
                />
              </div>
            </div>

            <div className="sm:col-span-2 mt-4">
              <button
                onClick={() => validateStep1() && setCurrentStep(2)}
                className="block w-full rounded-md bg-indigo-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all active:scale-[0.98]">
                Next: Preferences
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREFERENCES */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="sm:col-span-2">
              <Label
                htmlFor="website"
                className="block text-sm/6 font-semibold text-gray-900">
                Business Website (Optional)
              </Label>
              <div className="mt-2.5">
                <input
                  id="website"
                  type="url"
                  value={formData.businessWebsite}
                  onChange={(e) =>
                    updateForm({ businessWebsite: e.target.value })
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  placeholder="https://www.example.com"
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="currency"
                className="block text-sm/6 font-semibold text-gray-900">
                Default Currency
              </Label>
              <div className="mt-2.5 relative">
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => updateForm({ currency: e.target.value })}
                  className="block w-full appearance-none rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6">
                  <option value="UGX">UGX - Shilling</option>
                  <option value="USD">USD - Dollar</option>
                  <option value="KES">KES - Shilling</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
              </div>
            </div>

            <div>
              <Label
                htmlFor="tax-rate"
                className="block text-sm/6 font-semibold text-gray-900">
                Default Tax Rate (%)
              </Label>
              <div className="mt-2.5">
                <input
                  id="tax-rate"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.taxRate}
                  onChange={(e) => updateForm({ taxRate: e.target.value })}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className="block text-sm/6 font-semibold text-gray-900">
                Team Size
              </Label>
              <div className="mt-2.5 relative">
                <select
                  value={formData.businessSize}
                  onChange={(e) => updateForm({ businessSize: e.target.value })}
                  className="block w-full appearance-none rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6">
                  <option value="">Select team size</option>
                  {BUSINESS_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
              </div>
            </div>

            <div className="sm:col-span-2 grid grid-cols-3 gap-4 mt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all">
                Back
              </button>
              <button
                onClick={() => validateStep2() && setCurrentStep(3)}
                className="col-span-2 flex items-center justify-center rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all">
                Next: Profile Security
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROFILE SETUP */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="sm:col-span-2">
              <Label
                htmlFor="user-name"
                className="block text-sm/6 font-semibold text-gray-900">
                Your Full Name
              </Label>
              <div className="mt-2.5">
                <input
                  id="user-name"
                  type="text"
                  value={formData.userName}
                  onChange={(e) => updateForm({ userName: e.target.value })}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label
                htmlFor="user-phone"
                className="block text-sm/6 font-semibold text-gray-900">
                Your Phone Number
              </Label>
              <div className="mt-2.5">
                <input
                  id="user-phone"
                  type="text"
                  value={formData.userPhone}
                  onChange={(e) => updateForm({ userPhone: e.target.value })}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  placeholder="Contact for security alerts"
                />
              </div>
            </div>

            <div className="sm:col-span-2 bg-gray-900 p-8 rounded-lg text-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Security PIN</h3>
                  <p className="text-sm text-gray-400">
                    Establish a 4-digit code for dashboard access
                  </p>
                </div>
                <div className="bg-white/10 p-2.5 rounded-md">
                  <Check className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <input
                type="password"
                maxLength={4}
                value={formData.userPin}
                onChange={(e) =>
                  updateForm({ userPin: e.target.value.replace(/\D/g, "") })
                }
                className="block w-full bg-white/5 border-none rounded-md py-4 text-center text-4xl tracking-[0.5em] font-bold focus:ring-2 focus:ring-indigo-500 text-white placeholder:text-white/10"
                placeholder="0000"
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-3 gap-4 mt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all">
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="col-span-2 flex items-center justify-center rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all disabled:opacity-50">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Finalize Setup"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
