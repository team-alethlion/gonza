"use client";

import LoadingSpinner from "@/components/LoadingSpinner";

export default function AgencyLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <LoadingSpinner message="Warming up your dashboard..." />
    </div>
  );
}
