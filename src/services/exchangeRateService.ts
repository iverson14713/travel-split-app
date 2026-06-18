import {
  TRAVEL_CURRENCIES,
  formatDisplayRateValue,
  formatRateEstimateLine,
  getRateUnitLabel,
} from '../constants/currencies'
import { formatAmount } from '../utils/settlement'

export type ExchangeRateSource = 'api' | 'fallback'

export type RatesToTwdMap = Record<string, number>

export interface ExchangeRatesResult {
  ratesToTwd: RatesToTwdMap
  source: ExchangeRateSource
  fetchedAt: string
}

/** @deprecated Use ExchangeRatesResult */
export type ExchangeRatesToTwd = ExchangeRatesResult

export const FALLBACK_RATE_NOTICE = '目前使用預設估算匯率，可在設定中調整'

const ER_API_URL = 'https://open.er-api.com/v6/latest/TWD'

export const FALLBACK_RATES_TO_TWD: RatesToTwdMap = {
  TWD: 1,
  JPY: 0.215,
  USD: 32,
  EUR: 35,
  CNY: 4.4,
  KRW: 0.023,
  AUD: 21,
  HKD: 4.1,
  SGD: 24,
  THB: 0.9,
  VND: 0.00125,
  GBP: 41,
  CAD: 23.5,
  MYR: 6.8,
  PHP: 0.55,
  IDR: 0.002,
}

interface ErApiResponse {
  result?: string
  rates?: Record<string, number>
}

function normalizeRatesMap(raw: RatesToTwdMap): RatesToTwdMap {
  const result: RatesToTwdMap = { ...FALLBACK_RATES_TO_TWD }
  result.TWD = 1

  for (const currency of TRAVEL_CURRENCIES) {
    const code = currency.code
    const value = raw[code]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      result[code] = value
    }
  }

  return result
}

function fallbackResult(fetchedAt: string): ExchangeRatesResult {
  return {
    ratesToTwd: { ...FALLBACK_RATES_TO_TWD },
    source: 'fallback',
    fetchedAt,
  }
}

export function getRateFromTripMap(
  currency: string,
  ratesMap: RatesToTwdMap,
): number {
  const code = currency.toUpperCase()
  if (code === 'TWD') return 1
  const rate = ratesMap[code]
  if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) return rate
  const fallback = FALLBACK_RATES_TO_TWD[code]
  if (typeof fallback === 'number' && fallback > 0) return fallback
  return 1
}

export async function fetchLatestExchangeRatesToTwd(): Promise<ExchangeRatesResult> {
  const fetchedAt = new Date().toISOString()

  try {
    const response = await fetch(ER_API_URL)
    if (!response.ok) {
      throw new Error(`Exchange rate API ${response.status}`)
    }

    const data = (await response.json()) as ErApiResponse
    const hasValidPayload = data.result === 'success' || !!data.rates
    if (!hasValidPayload || !data.rates) {
      throw new Error('Invalid exchange rate payload')
    }

    const ratesToTwd: RatesToTwdMap = { TWD: 1 }
    let missingCount = 0

    for (const currency of TRAVEL_CURRENCIES) {
      if (currency.code === 'TWD') continue
      const twdPerForeign = data.rates[currency.code]
      if (typeof twdPerForeign === 'number' && Number.isFinite(twdPerForeign) && twdPerForeign > 0) {
        ratesToTwd[currency.code] = 1 / twdPerForeign
      } else {
        ratesToTwd[currency.code] = FALLBACK_RATES_TO_TWD[currency.code] ?? 1
        missingCount++
      }
    }

    const allMissing = missingCount === TRAVEL_CURRENCIES.length - 1
    if (allMissing) {
      return fallbackResult(fetchedAt)
    }

    return {
      ratesToTwd: normalizeRatesMap(ratesToTwd),
      source: 'api',
      fetchedAt,
    }
  } catch {
    return fallbackResult(fetchedAt)
  }
}

export function buildTwdEstimateHint(
  currency: string,
  amount: number,
  rateToTwd: number,
): { amountLine: string; rateLine: string } | null {
  const code = currency.toUpperCase()
  if (code === 'TWD' || !Number.isFinite(amount) || amount <= 0) return null

  const twdAmount = Math.round(amount * rateToTwd)
  return {
    amountLine: `約 TWD ${formatAmount(twdAmount, 'TWD')}`,
    rateLine: formatRateEstimateLine(code, rateToTwd),
  }
}

export function formatJpyPer100Twd(jpyToTwdRate: number): string {
  return formatDisplayRateValue('JPY', jpyToTwdRate)
}

export function formatUsdToTwd(usdToTwdRate: number): string {
  return formatDisplayRateValue('USD', usdToTwdRate)
}

export function formatRateSummaryLine(code: string, rateToTwd: number): string {
  const label = getRateUnitLabel(code).replace(' =', '')
  return `${label} ≈ TWD ${formatDisplayRateValue(code, rateToTwd)}`
}
