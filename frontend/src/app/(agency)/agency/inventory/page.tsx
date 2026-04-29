import { Suspense } from "react";
import InventoryContent from "./InventoryContent";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function InventoryPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] w-full items-center justify-center">
        <LoadingSpinner message="Loading inventory and stock levels..." />
      </div>
    }>
      <InventoryContent />
    </Suspense>
  );
}
