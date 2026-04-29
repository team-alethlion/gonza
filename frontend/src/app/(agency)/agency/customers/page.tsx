import { Suspense } from "react";
import CustomersContent from "./CustomersContent";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] w-full items-center justify-center">
        <LoadingSpinner message="Loading your customers and insights..." />
      </div>
    }>
      <CustomersContent />
    </Suspense>
  );
}
