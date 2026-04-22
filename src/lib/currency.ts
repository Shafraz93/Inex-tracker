/** App default: Sri Lankan Rupees. Use this for every money display. */
export const APP_CURRENCY_CODE = "LKR" as const;

/** Locale for grouping/separators and currency symbol (e.g. Rs). */
export const APP_NUMBER_LOCALE = "en-LK" as const;

/** Format any numeric amount as the app currency (LKR). */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat(APP_NUMBER_LOCALE, {
    style: "currency",
    currency: APP_CURRENCY_CODE,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}
