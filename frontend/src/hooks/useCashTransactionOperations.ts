/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { toast } from "sonner";
import { useCashTransactions } from "@/hooks/useCashTransactions";
import { findCashTransactionAction } from "@/app/actions/finance";
import { useBusiness } from "@/contexts/BusinessContext";

export const useCashTransactionOperations = () => {
  const { currentBusiness } = useBusiness();
  const {
    createTransaction: createCashTransaction,
    updateTransaction: updateCashTransaction,
    deleteTransaction: deleteCashTransaction,
  } = useCashTransactions();

  const createCashTransactionForSale = useCallback(
    async (
      sale: any,
      amount: number,
      linkToCash: boolean,
      selectedCashAccountId: string,
      selectedDate: Date,
      paymentStatus: string,
    ) => {
      if (!linkToCash || !selectedCashAccountId || paymentStatus !== "Paid") {
        return null;
      }

      try {
        const description = `Sale to ${
          sale.customerName || sale.customer_name || "Customer"
        } - Receipt #${sale.receiptNumber || sale.receipt_number || "N/A"}`;

        const cashTransaction = await createCashTransaction({
          accountId: selectedCashAccountId,
          amount: amount,
          transactionType: "cash_in",
          category: "Cash sale",
          description: description,
          date: selectedDate,
          personInCharge: "",
          tags: [],
          paymentMethod: "",
          receiptImage: "",
        });

        return cashTransaction?.id || null;
      } catch (error) {
        console.error("Error creating cash transaction:", error);
        toast.error("Failed to create cash transaction");
        return null;
      }
    },
    [createCashTransaction],
  );

  const updateCashTransactionForSale = useCallback(
    async (
      sale: any,
      amount: number,
      cashTransactionId: string | null,
      originalPaymentStatus: string,
      paymentStatus: string,
      linkToCash: boolean,
      selectedCashAccountId: string,
      selectedDate: Date,
    ) => {
      try {
        const description = `Sale to ${
          sale.customerName || sale.customer_name || "Customer"
        } - Receipt #${sale.receiptNumber || sale.receipt_number || "N/A"}`;

        const validCashAccountId =
          selectedCashAccountId && selectedCashAccountId.trim() !== "";

        if (
          !cashTransactionId &&
          linkToCash &&
          paymentStatus === "Paid" &&
          validCashAccountId
        ) {
          const cashTransaction = await createCashTransaction({
            accountId: selectedCashAccountId,
            amount: amount,
            transactionType: "cash_in",
            category: "Cash sale",
            description: description,
            date: selectedDate,
            personInCharge: "",
            tags: [],
            paymentMethod: "",
            receiptImage: "",
          });
          return cashTransaction?.id || null;
        }

        if (!cashTransactionId) {
          return null;
        }

        if (
          originalPaymentStatus === "Paid" &&
          paymentStatus === "Installment Sale"
        ) {
          await deleteCashTransaction(cashTransactionId);
          return null;
        }

        if (linkToCash && paymentStatus === "Paid" && validCashAccountId) {
          await updateCashTransaction(cashTransactionId, {
            amount: amount,
            category: "Cash sale",
            description: description,
            date: selectedDate,
          });
          return cashTransactionId;
        } else {
          await deleteCashTransaction(cashTransactionId);
          return null;
        }
      } catch (error) {
        console.error("Error updating cash transaction:", error);
        toast.error("Failed to update cash transaction");
        return cashTransactionId;
      }
    },
    [createCashTransaction, updateCashTransaction, deleteCashTransaction],
  );

  const createInstallmentPaymentWithCash = useCallback(
    async (
      saleId: string,
      amount: number,
      saleDescription: string,
      linkToCash: boolean,
      selectedCashAccountId: string,
      locationId: string,
      createInstallmentPayment: any,
    ) => {
      if (amount <= 0) {
        return null;
      }

      if (!linkToCash || !selectedCashAccountId) {
        return await createInstallmentPayment({
          saleId,
          amount,
        });
      }

      return await createInstallmentPayment({
        saleId,
        amount,
        accountId: selectedCashAccountId,
        locationId,
        date: new Date(),
      });
    },
    [],
  );

  const findCashTransactionForSale = useCallback(
    async (cashTransactionId: string) => {
      try {
        if (!currentBusiness?.id) return null;
        const result = await findCashTransactionAction(
          cashTransactionId,
          currentBusiness.id,
        );
        if (result.success && result.data) {
          return result.data.accountId;
        }
      } catch (error) {
        console.error("Error finding cash transaction:", error);
      }
      return null;
    },
    [currentBusiness]
    );

  return {
    createCashTransactionForSale,
    updateCashTransactionForSale,
    createInstallmentPaymentWithCash,
    findCashTransactionForSale,
  };
};
