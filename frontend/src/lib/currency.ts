const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const compactInrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatINR(value: number) {
  return inrFormatter.format(value);
}

export function formatCompactINR(value: number) {
  return compactInrFormatter.format(value);
}
