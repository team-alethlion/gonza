import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getBusinessSettingsAction,
  upsertBusinessSettingsAction,
} from "@/app/actions/business-settings";
import { BusinessSettings } from "@/types";

interface BusinessMetadata {
  payment_info?: string;
  default_print_format?: "standard" | "thermal";
  default_printer_name?: string;
  default_printer_type?: "USB" | "Bluetooth";
  printer_paper_size?: "58mm" | "80mm";
}

// Utility function to parse payment info text into structured format
export const parsePaymentInfo = (
  paymentInfo: string,
): { method: string; accountNumber: string; accountName: string }[] => {
  if (!paymentInfo || paymentInfo.trim() === "") {
    return [];
  }

  const lines = paymentInfo.split("\n").filter((line) => line.trim() !== "");
  const methods: {
    method: string;
    accountNumber: string;
    accountName: string;
  }[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 < lines.length) {
      methods.push({
        method: lines[i].trim(),
        accountNumber: lines[i + 1].trim(),
        accountName: lines[i + 2].trim(),
      });
    }
  }

  return methods;
};

// Utility function to convert payment methods array back to string format
export const convertPaymentMethodsToString = (
  paymentMethods: {
    method: string;
    accountNumber: string;
    accountName: string;
  }[],
): string => {
  return paymentMethods
    .filter(
      (pm) =>
        pm.method.trim() !== "" ||
        pm.accountNumber.trim() !== "" ||
        pm.accountName.trim() !== "",
    )
    .map((pm) => `${pm.method}\n${pm.accountNumber}\n${pm.accountName}`)
    .join("\n");
};

// Default settings for new businesses
const getDefaultSettings = (): BusinessSettings => ({
  businessName: "",
  businessAddress: "",
  businessPhone: "",
  businessEmail: "",
  currency: "UGX",
  paymentInfo: "",
  defaultPrintFormat: "standard",
});

export const useBusinessSettings = () => {
  const { currentBusiness, initialBusinessSettings } = useBusiness();
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const loadSettings = async (): Promise<BusinessSettings> => {
    if (!currentBusiness) {
      return getDefaultSettings();
    }

    try {
      const data = await getBusinessSettingsAction(currentBusiness.id);

      if (data) {
        // Extract payment info from metadata
        const paymentInfo =
          data.metadata && typeof data.metadata === "object"
            ? ((data.metadata as Record<string, unknown>)
                .payment_info as string) || ""
            : "";

        return {
          id: data.id,
          businessName: data.business_name || "",
          businessAddress: data.business_address || "",
          businessPhone: data.business_phone || "",
          businessEmail: data.business_email || "",
          businessLogo: data.business_logo || undefined,
          currency: data.currency || "UGX",
          signature: data.signature || undefined,
          paymentInfo: paymentInfo,
          defaultPrintFormat:
            data.metadata && typeof data.metadata === "object"
              ? ((data.metadata as Record<string, unknown>)
                  .default_print_format as "standard" | "thermal") || "standard"
              : "standard",
          defaultPrinterName:
            data.metadata && typeof data.metadata === "object"
              ? ((data.metadata as Record<string, unknown>)
                  .default_printer_name as string) || ""
              : "",
          defaultPrinterType:
            data.metadata && typeof data.metadata === "object"
              ? ((data.metadata as Record<string, unknown>)
                  .default_printer_type as "USB" | "Bluetooth") || "USB"
              : "USB",
          printerPaperSize:
            data.metadata && typeof data.metadata === "object"
              ? ((data.metadata as Record<string, unknown>)
                  .printer_paper_size as "58mm" | "80mm") || "58mm"
              : "58mm",
        };
      } else {
        return getDefaultSettings();
      }
    } catch (error) {
      console.error("Error loading business settings:", error);
      return getDefaultSettings();
    }
  };

  // Transform initial data if available
  const memoizedInitialData = useMemo(() => {
    if (!initialBusinessSettings) return getDefaultSettings();
    return {
      id: initialBusinessSettings.id,
      businessName: initialBusinessSettings.business_name || "",
      businessAddress: initialBusinessSettings.business_address || "",
      businessPhone: initialBusinessSettings.business_phone || "",
      businessEmail: initialBusinessSettings.business_email || "",
      businessLogo: initialBusinessSettings.business_logo || undefined,
      currency: initialBusinessSettings.currency || "UGX",
      signature: initialBusinessSettings.signature || undefined,
      paymentInfo:
        (initialBusinessSettings.metadata as BusinessMetadata)?.payment_info ||
        "",
      defaultPrintFormat:
        (initialBusinessSettings.metadata as BusinessMetadata)
          ?.default_print_format || "standard",
      defaultPrinterName:
        (initialBusinessSettings.metadata as BusinessMetadata)
          ?.default_printer_name || "",
      defaultPrinterType:
        (initialBusinessSettings.metadata as BusinessMetadata)
          ?.default_printer_type || "USB",
      printerPaperSize:
        (initialBusinessSettings.metadata as BusinessMetadata)
          ?.printer_paper_size || "58mm",
    };
  }, [initialBusinessSettings]);

  // React Query for settings loading with proper caching
  const {
    data: settings = memoizedInitialData,
    isLoading: isQueryLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["businessSettings", currentBusiness?.id],
    queryFn: loadSettings,
    enabled: !!currentBusiness?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: initialBusinessSettings ? memoizedInitialData : undefined,
  });

  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    if (!currentBusiness) {
      toast({
        title: "Error",
        description: "No business selected",
        variant: "destructive",
      });
      return false;
    }

    try {
      if (!authUser?.id) return false;

      // Prepare the metadata object with payment info
      const metadata = {
        payment_info: newSettings.hasOwnProperty("paymentInfo")
          ? newSettings.paymentInfo
          : settings.paymentInfo || "",
        default_print_format: newSettings.hasOwnProperty("defaultPrintFormat")
          ? newSettings.defaultPrintFormat
          : settings.defaultPrintFormat || "standard",
        default_printer_name: newSettings.hasOwnProperty("defaultPrinterName")
          ? newSettings.defaultPrinterName
          : settings.defaultPrinterName || "",
        default_printer_type: newSettings.hasOwnProperty("defaultPrinterType")
          ? newSettings.defaultPrinterType
          : settings.defaultPrinterType || "USB",
        printer_paper_size: newSettings.hasOwnProperty("printerPaperSize")
          ? newSettings.printerPaperSize
          : settings.printerPaperSize || "58mm",
      };

      const updateData = {
        business_name: newSettings.hasOwnProperty("businessName")
          ? newSettings.businessName
          : settings.businessName,
        business_address: newSettings.hasOwnProperty("businessAddress")
          ? newSettings.businessAddress
          : settings.businessAddress,
        business_phone: newSettings.hasOwnProperty("businessPhone")
          ? newSettings.businessPhone
          : settings.businessPhone,
        business_email: newSettings.hasOwnProperty("businessEmail")
          ? newSettings.businessEmail
          : settings.businessEmail,
        business_logo: newSettings.hasOwnProperty("businessLogo")
          ? newSettings.businessLogo
          : settings.businessLogo,
        currency: newSettings.hasOwnProperty("currency")
          ? newSettings.currency
          : settings.currency,
        signature: newSettings.hasOwnProperty("signature")
          ? newSettings.signature
          : settings.signature,
        metadata: metadata,
      };

      const response = await upsertBusinessSettingsAction(
        currentBusiness.id,
        authUser.id,
        updateData,
      );

      if (!response.success) throw new Error(response.error);

      toast({
        title: "Success",
        description: "Business settings updated successfully",
      });
      refetch();
      return true;
    } catch (error) {
      console.error("Error updating business settings:", error);
      toast({
        title: "Error",
        description: "Failed to update business settings",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    settings,
    isLoading: isQueryLoading || isFetching,
    updateSettings,
    loadSettings,
  };
};
