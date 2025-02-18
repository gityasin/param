// Currency formatting utilities
export const CURRENCIES = {
  TRY: { symbol: '₺', locale: 'tr-TR', position: 'after', rate: 31.89 },
  USD: { symbol: '$', locale: 'en-US', position: 'before', rate: 1 },
  EUR: { symbol: '€', locale: 'de-DE', position: 'after', rate: 0.91 },
  GBP: { symbol: '£', locale: 'en-GB', position: 'before', rate: 0.79 },
  JPY: { symbol: '¥', locale: 'ja-JP', position: 'before', rate: 149.45 },
  CNY: { symbol: '¥', locale: 'zh-CN', position: 'before', rate: 7.23 },
  INR: { symbol: '₹', locale: 'en-IN', position: 'before', rate: 83.12 },
  AUD: { symbol: '$', locale: 'en-AU', position: 'before', rate: 1.54 },
  CAD: { symbol: '$', locale: 'en-CA', position: 'before', rate: 1.36 },
  CHF: { symbol: 'CHF', locale: 'de-CH', position: 'before', rate: 0.89 },
};

export const convertAmount = (amount, fromCurrency = 'USD', toCurrency = 'USD') => {
  const fromRate = CURRENCIES[fromCurrency]?.rate || 1;
  const toRate = CURRENCIES[toCurrency]?.rate || 1;
  
  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
};

export const formatCurrency = (amount, currencyCode = 'USD') => {
  try {
    const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
    const formattedNumber = new Intl.NumberFormat(currency.locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return currency.position === 'before' 
      ? `${currency.symbol}${formattedNumber}`
      : `${formattedNumber} ${currency.symbol}`;
  } catch (error) {
    console.warn('Error formatting currency:', error);
    return `${CURRENCIES.USD.symbol}${amount.toFixed(2)}`;
  }
};

export const getCurrencySymbol = (currencyCode = 'USD') => {
  return CURRENCIES[currencyCode]?.symbol || CURRENCIES.USD.symbol;
};

export const getAvailableCurrencies = () => {
  return Object.entries(CURRENCIES).map(([code, details]) => ({
    code,
    symbol: details.symbol,
    label: `${code} (${details.symbol})`,
  }));
};
