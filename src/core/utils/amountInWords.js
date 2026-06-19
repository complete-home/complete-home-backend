const BELOW_TWENTY = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function wordsBelow1000(n) {
  if (n === 0) return "";
  if (n < 20) return BELOW_TWENTY[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return r ? `${TENS[t]} ${BELOW_TWENTY[r]}` : TENS[t];
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = `${BELOW_TWENTY[h]} Hundred`;
  return r ? `${head} ${wordsBelow1000(r)}` : head;
}

function segmentToWords(n, label) {
  if (!n) return "";
  return `${wordsBelow1000(n)} ${label}`.trim();
}

export function amountInWordsINR(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return "Zero Rupees only";

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;

  const parts = [
    segmentToWords(crore, "Crore"),
    segmentToWords(lakh, "Lakh"),
    segmentToWords(thousand, "Thousand"),
    wordsBelow1000(rest),
  ].filter(Boolean);

  return `${parts.join(" ").replace(/\s+/g, " ").trim()} Rupees only`;
}
