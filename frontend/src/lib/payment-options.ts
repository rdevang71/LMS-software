export const paymentStatuses = ["Paid", "Partially Paid", "Pending", "Refunded", "Free"];

export const paymentMethods = ["Cash", "UPI", "Card", "Bank transfer", "Other", "Not applicable"];

export const asSelectOptions = (values: string[]) =>
  values.map((value) => ({ label: value, value }));

export function validatePaymentDetails(amount: number, paidAmount: number, status: string) {
  if (!Number.isFinite(amount) || amount < 0) return "Total fee must be zero or more";
  if (!Number.isFinite(paidAmount) || paidAmount < 0) return "Fee paid must be zero or more";
  if (paidAmount > amount) return "Fee paid cannot be greater than the total fee";
  if (status === "Paid" && paidAmount !== amount)
    return "For Paid status, fee paid must equal the total fee";
  if (status === "Partially Paid" && (paidAmount <= 0 || paidAmount >= amount))
    return "For Partially Paid status, enter a payment below the total fee";
  if (status === "Pending" && paidAmount !== 0)
    return "Use Partially Paid when some of the fee has been paid";
  if (status === "Free" && (amount !== 0 || paidAmount !== 0))
    return "A free enrollment must have zero total and paid fees";
  return null;
}
