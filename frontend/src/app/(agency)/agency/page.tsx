import { Suspense } from "react";
import DashboardContent from "./components/DashboardContent";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";

export default function AgencyDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
