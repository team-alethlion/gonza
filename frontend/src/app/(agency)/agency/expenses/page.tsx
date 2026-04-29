import { Suspense } from "react";
import ExpensesContent from "./ExpensesContent";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ExpensesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] w-full items-center justify-center">
        <LoadingSpinner message="Loading expense reports..." />
      </div>
    }>
      <ExpensesContent />
    </Suspense>
  );
}
