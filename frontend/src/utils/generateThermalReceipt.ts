import EscPosEncoder from "esc-pos-encoder";
import { format } from "date-fns";
import { formatNumber } from "@/lib/utils";
import { numberToWords } from "@/utils/numberToWords";
import { parsePaymentInfo } from "@/hooks/useBusinessSettings";

type alignType = "left" | "center" | "right";
type ColDef = { width: number; align: alignType };

export async function generateThermalReceipt(
  sale: any,
  settings: any,
  currency?: string,
): Promise<Uint8Array> {
  const displayCurrency = currency || settings.currency || "";
  const encoder = new EscPosEncoder();

  encoder.initialize();

  const is80mm = settings.printerPaperSize === "80mm";

  if (is80mm) {
    encoder.raw([0x1d, 0x57, 0x40, 0x02]); // GS W: Set width to 576 dots (80mm)
    encoder.align("left"); // User requested "far left" for everything
  } else {
    encoder.raw([0x1d, 0x4c, 0, 0]); // GS L: Reset left margin to 0
    encoder.raw([0x1d, 0x57, 0x80, 0x01]); // GS W: Set printable area width (384 dots = 58mm)
    encoder.align("left");
  }

  // ===== Business Header =====
  encoder.align("left");

  encoder.line(is80mm ? "=".repeat(42) : "=".repeat(32));

  if (settings.businessName) {
    encoder
      .size("double" as any)
      .bold(true)
      .line(settings.businessName.toUpperCase())
      .bold(false)
      .size("normal" as any);
  }
  encoder.line(is80mm ? "=".repeat(42) : "=".repeat(32));

  if (settings.businessAddress) encoder.line(settings.businessAddress);
  if (settings.businessPhone) encoder.line(`Tel: ${settings.businessPhone}`);
  if (settings.businessEmail) encoder.line(settings.businessEmail);
  encoder.line(is80mm ? "-".repeat(42) : "-".repeat(32)); // Wider line for 80mm

  // ===== Document Title =====
  const titleMap: Record<string, string> = {
    Quote: "QUOTATION",
    Paid: "SALES RECEIPT",
    "Installment Sale": "INSTALLMENT SALE",
    "NOT PAID": "INVOICE",
  };
  const docTitle = titleMap[sale.paymentStatus] || "INVOICE";
  encoder.bold(true).line(docTitle).bold(false);

  encoder.line(is80mm ? "-".repeat(42) : "-".repeat(32));

  // ===== Receipt Info (Apply 10mm margin) =====
  encoder.raw([0x1d, 0x4c, 0, 0]);
  encoder.align("left");

  encoder.table(
    [
      { width: 12, align: "left" },
      { width: 16, align: "right" },
    ] as ColDef[],
    [
      ["Receipt #:", sale.receiptNumber || ""],
      ["Date:", format(new Date(sale.date || Date.now()), "MMM dd, yyyy")],
      ["Status:", sale.paymentStatus || ""],
    ],
  );
  encoder.line(is80mm ? "-".repeat(42) : "-".repeat(32));

  // ===== Customer Info =====
  if (sale.customerName) {
    encoder.line(`Customer: ${sale.customerName}`);
    if (sale.customerAddress) encoder.line(`Address: ${sale.customerAddress}`);
    if (sale.customerContact) encoder.line(`Contact: ${sale.customerContact}`);
    encoder.line(is80mm ? "-".repeat(42) : "-".repeat(32));
  }

  // ===== Items Table Definition =====
  // 58mm (32 chars): Item(14) + Spacer(3) + Qty(5) + Tot(10) = 32
  // 80mm (42 chars): Item(22) + Spacer(4) + Qty(6) + Tot(10) = 42
  // 58mm (32 chars): Item(12) + Spacer(1) + Qty(5) + Tot(14) = 32
  // 80mm (42 chars): Item(21) + Spacer(1) + Qty(6) + Tot(14) = 42
  const tableColumns: ColDef[] = is80mm
    ? [
      { width: 21, align: "left" },
      { width: 1, align: "center" },
      { width: 6, align: "right" },
      { width: 14, align: "right" },
    ]
    : [
      { width: 12, align: "left" },
      { width: 1, align: "center" },
      { width: 5, align: "right" },
      { width: 14, align: "right" },
    ];

  encoder.table(tableColumns, [["Item", "", "Qty", `Total`]]);
  encoder.line(is80mm ? "-".repeat(42) : "-".repeat(32));

  let subtotalBeforeDiscount = 0;
  let totalDiscountAmount = 0;

  Array.isArray(sale.items) &&
    sale.items.forEach((item: any) => {
      const quantity = item.quantity || 0;
      const price = item.price || 0;
      const subtotal = quantity * price;
      const discount =
        item.discountAmount ??
        (subtotal * (item.discountPercentage || 0)) / 100;
      const total = subtotal - discount;

      subtotalBeforeDiscount += subtotal;
      totalDiscountAmount += discount;

      encoder.table(tableColumns, [
        [item.description || "", "", String(quantity), formatNumber(total)],
      ]);

      if (discount > 0) {
        const discText =
          item.discountType === "amount"
            ? ""
            : `(${item.discountPercentage || 0}%)`;
        encoder
          .italic(true)
          .table(
            [
              { width: 22, align: "left" },
              { width: 10, align: "right" },
            ] as ColDef[],
            [[`  Discount ${discText}`, `-${formatNumber(discount)}`]],
          )
          .italic(false);
      }

      encoder.line(is80mm ? "-".repeat(42) : "-".repeat(32));
    });

  // ===== Totals (Vertical Layout as requested) =====
  const subtotalAfterDiscount = subtotalBeforeDiscount - totalDiscountAmount;
  const taxRate = sale.taxRate || 0;
  const taxAmount = subtotalAfterDiscount * (taxRate / 100);
  const totalAmount = subtotalAfterDiscount + taxAmount;

  // For installment sales, sum up all payments from history if available
  const totalPaidFromHistory = Array.isArray(sale.payments)
    ? sale.payments.reduce(
      (sum: number, p: any) => sum + (Number(p.amount) || 0),
      0,
    )
    : 0;

  const amountPaid =
    sale.paymentStatus === "Installment Sale"
      ? totalPaidFromHistory + (Number(sale.amountPaid) || 0)
      : Number(sale.amountPaid) || 0;

  const amountDue = Number(sale.amountDue) || 0;

  encoder.newline();

  const totalsColumns: ColDef[] = [
    { width: 14, align: "left" },
    { width: is80mm ? 28 : 18, align: "right" },
  ];

  encoder.table(totalsColumns, [
    ["Subtotal:", `${displayCurrency} ${formatNumber(subtotalBeforeDiscount)}`],
  ]);

  if (totalDiscountAmount > 0) {
    encoder.table(totalsColumns, [
      [
        "Total Discount:",
        `-${displayCurrency} ${formatNumber(totalDiscountAmount)}`,
      ],
    ]);
  }

  if (taxRate > 0) {
    encoder.table(totalsColumns, [
      [`Tax (${taxRate}%):`, `${displayCurrency} ${formatNumber(taxAmount)}`],
    ]);
  }

  encoder
    .bold(true)
    .table(totalsColumns, [
      ["TOTAL:", `${displayCurrency} ${formatNumber(totalAmount)}`],
    ])
    .bold(false);

  if (sale.paymentStatus === "Installment Sale") {
    encoder.table(totalsColumns, [
      ["Amount Paid:", `${displayCurrency} ${formatNumber(amountPaid)}`],
      ["Amount Due:", `${displayCurrency} ${formatNumber(amountDue)}`],
    ]);
  }

  encoder.line(is80mm ? "-".repeat(42) : "-".repeat(32));
  encoder.text(`Amount in words:\n${numberToWords(totalAmount)} only\n`);
  encoder.line(is80mm ? "-".repeat(42) : "-".repeat(32));

  // Reset margin for the rest of the receipt (Payment Info, Signature, Footer)
  encoder.raw([0x1d, 0x4c, 0, 0]);
  encoder.align("left");

  // ===== Payment Info =====
  const paymentMethods = settings.paymentInfo
    ? parsePaymentInfo(settings.paymentInfo)
    : [];
  if (Array.isArray(paymentMethods) && paymentMethods.length > 0) {
    paymentMethods.forEach((p: any) => {
      if (p.method || p.accountNumber || p.accountName) {
        encoder
          .bold(true)
          .line(p.method || "")
          .bold(false);
        if (p.accountNumber) encoder.line(`Acc: ${p.accountNumber}`);
        if (p.accountName) encoder.line(`Name: ${p.accountName}`);
        encoder.line(is80mm ? "-".repeat(42) : "-".repeat(32));
      }
    });
  }

  // ===== Footer =====
  encoder.line("Thank you for your business!");
  encoder.size("small" as any).line("Created by Gonza Systems").size("normal" as any);
  encoder.line(is80mm ? "=".repeat(42) : "=".repeat(32));

  // Cut paper
  encoder.newline().newline().newline().cut();

  return encoder.encode();
}
