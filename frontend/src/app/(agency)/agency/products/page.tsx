import { enforceStrictAccess } from "@/lib/strict-guard";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  await enforceStrictAccess();
  return <ProductsClient />;
}
