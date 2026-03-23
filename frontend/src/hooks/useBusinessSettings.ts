import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getBusinessSettingsAction,
  upsertBusinessSettingsAction,
} from "@/app/actions/business-settings";
import { BusinessSettings, mapDbBusinessSettingsToBusinessSettings } from "@/types";

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
        return mapDbBusinessSettingsToBusinessSettings(data);
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
    // 🚀 ALREADY MAPPED: The BusinessContext now provides settings in camelCase format
    return {
      ...initialBusinessSettings
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
