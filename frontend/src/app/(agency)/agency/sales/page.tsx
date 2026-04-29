import { Suspense } from "react";
import SalesContent from "@/components/sales/SalesContent";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function SalesPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={
        <div className="flex flex-col h-[60vh] w-full items-center justify-center">
          <LoadingSpinner message="Fetching your sales history..." />
        </div>
      }>
        <SalesContent />
      </Suspense>
    </div>
  );
}
