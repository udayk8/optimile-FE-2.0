export function normalizeCurrencyText(value: string) {
  return value
    .replace(/Ã¢â€šÂ¹/g, "\u20B9")
    .replace(/â‚¹/g, "\u20B9")
    .replace(/¹/g, "\u20B9")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatCurrency(value: number) {
  return normalizeCurrencyText(
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value),
  );
}
