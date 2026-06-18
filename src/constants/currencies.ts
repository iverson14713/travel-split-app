export interface CurrencyDefinition {
  code: string
  label: string
  shortLabel: string
  decimalDigits: number
  displayRateUnit: number
}

export const TRAVEL_CURRENCIES: CurrencyDefinition[] = [
  { code: 'TWD', label: 'TWD 台幣', shortLabel: '台幣', decimalDigits: 0, displayRateUnit: 1 },
  { code: 'JPY', label: 'JPY 日圓', shortLabel: '日圓', decimalDigits: 0, displayRateUnit: 100 },
  { code: 'USD', label: 'USD 美元', shortLabel: '美元', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'EUR', label: 'EUR 歐元', shortLabel: '歐元', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'CNY', label: 'CNY 人民幣', shortLabel: '人民幣', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'KRW', label: 'KRW 韓元', shortLabel: '韓元', decimalDigits: 0, displayRateUnit: 1000 },
  { code: 'AUD', label: 'AUD 澳幣', shortLabel: '澳幣', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'HKD', label: 'HKD 港幣', shortLabel: '港幣', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'SGD', label: 'SGD 新加坡幣', shortLabel: '新加坡幣', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'THB', label: 'THB 泰銖', shortLabel: '泰銖', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'VND', label: 'VND 越南盾', shortLabel: '越南盾', decimalDigits: 0, displayRateUnit: 100000 },
  { code: 'GBP', label: 'GBP 英鎊', shortLabel: '英鎊', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'CAD', label: 'CAD 加幣', shortLabel: '加幣', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'MYR', label: 'MYR 馬幣', shortLabel: '馬幣', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'PHP', label: 'PHP 菲律賓披索', shortLabel: '菲律賓披索', decimalDigits: 2, displayRateUnit: 1 },
  { code: 'IDR', label: 'IDR 印尼盾', shortLabel: '印尼盾', decimalDigits: 0, displayRateUnit: 1 },
]

export const PRIMARY_RATE_CURRENCY_CODES = ['JPY', 'USD'] as const

export const OTHER_RATE_CURRENCY_CODES = [
  'EUR',
  'KRW',
  'CNY',
  'HKD',
  'SGD',
  'THB',
  'VND',
  'AUD',
  'GBP',
  'CAD',
  'MYR',
  'PHP',
  'IDR',
] as const

/** @deprecated Use PRIMARY_RATE_CURRENCY_CODES */
export const COMMON_RATE_CURRENCY_CODES = PRIMARY_RATE_CURRENCY_CODES

/** @deprecated Use OTHER_RATE_CURRENCY_CODES */
export const MORE_RATE_CURRENCY_CODES = OTHER_RATE_CURRENCY_CODES

const currencyMap = new Map(TRAVEL_CURRENCIES.map((c) => [c.code, c]))

export function getCurrency(code: string): CurrencyDefinition | undefined {
  return currencyMap.get(code.toUpperCase())
}

export function getCurrencyDecimalDigits(code: string): number {
  return getCurrency(code)?.decimalDigits ?? 2
}

export function getRateUnitLabel(code: string): string {
  const currency = getCurrency(code)
  if (!currency || currency.code === 'TWD') return '1 TWD ='
  if (currency.displayRateUnit === 1) return `1 ${currency.code} =`
  return `${currency.displayRateUnit} ${currency.code} =`
}

export function formatDisplayRateValue(code: string, rateToTwd: number): string {
  const currency = getCurrency(code)
  if (!currency || currency.code === 'TWD') return '1'
  const value = rateToTwd * currency.displayRateUnit
  if (currency.displayRateUnit >= 100000) return value.toFixed(2)
  if (currency.displayRateUnit >= 1000) return value.toFixed(2)
  if (currency.displayRateUnit === 100) return (Math.round(value * 10) / 10).toFixed(1)
  return (Math.round(value * 100) / 100).toFixed(2)
}

export function parseDisplayRateToTwd(code: string, displayValue: number): number {
  const currency = getCurrency(code)
  if (!currency || currency.code === 'TWD') return 1
  if (!Number.isFinite(displayValue) || displayValue <= 0) return NaN
  return displayValue / currency.displayRateUnit
}

export function formatRateEstimateLine(code: string, rateToTwd: number): string {
  const unitLabel = getRateUnitLabel(code).replace(' =', '')
  const display = formatDisplayRateValue(code, rateToTwd)
  return `以 ${unitLabel} = TWD ${display} 估算`
}
