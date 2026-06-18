export type ExchangeRateSource = 'api' | 'fallback'

export interface ExchangeRatesToTwd {
  jpyToTwdRate: number
  usdToTwdRate: number
  source: ExchangeRateSource
  fetchedAt: string
}

const FALLBACK_JPY_TO_TWD = 0.215
const FALLBACK_USD_TO_TWD = 32

function fallbackRates(): ExchangeRatesToTwd {
  return {
    jpyToTwdRate: FALLBACK_JPY_TO_TWD,
    usdToTwdRate: FALLBACK_USD_TO_TWD,
    source: 'fallback',
    fetchedAt: new Date().toISOString(),
  }
}

async function fetchRateToTwd(base: string): Promise<number | null> {
  const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}&symbols=TWD`
  const response = await fetch(url)
  if (!response.ok) return null

  const data = (await response.json()) as { rates?: { TWD?: number } }
  const rate = data.rates?.TWD
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null
  return rate
}

export async function fetchLatestExchangeRatesToTwd(): Promise<ExchangeRatesToTwd> {
  const fetchedAt = new Date().toISOString()

  try {
    const [jpyToTwdRate, usdToTwdRate] = await Promise.all([
      fetchRateToTwd('JPY'),
      fetchRateToTwd('USD'),
    ])

    if (jpyToTwdRate == null || usdToTwdRate == null) {
      return { ...fallbackRates(), fetchedAt }
    }

    return {
      jpyToTwdRate,
      usdToTwdRate,
      source: 'api',
      fetchedAt,
    }
  } catch {
    return { ...fallbackRates(), fetchedAt }
  }
}

export function formatJpyPer100Twd(jpyToTwdRate: number): string {
  return (Math.round(jpyToTwdRate * 1000) / 10).toFixed(1)
}

export function formatUsdToTwd(usdToTwdRate: number): string {
  const rounded = Math.round(usdToTwdRate * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}
