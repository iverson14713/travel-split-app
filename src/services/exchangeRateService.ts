export type ExchangeRateSource = 'api' | 'fallback'

export interface ExchangeRatesToTwd {
  jpyToTwdRate: number
  usdToTwdRate: number
  source: ExchangeRateSource
  fetchedAt: string
}

export const FALLBACK_RATE_NOTICE = '目前使用預設估算匯率，可在設定中調整'

const ER_API_BASE = 'https://open.er-api.com/v6/latest'
const FALLBACK_JPY_TO_TWD = 0.215
const FALLBACK_USD_TO_TWD = 32

interface ErApiResponse {
  result?: string
  rates?: { TWD?: number }
}

function fallbackRates(): ExchangeRatesToTwd {
  return {
    jpyToTwdRate: FALLBACK_JPY_TO_TWD,
    usdToTwdRate: FALLBACK_USD_TO_TWD,
    source: 'fallback',
    fetchedAt: new Date().toISOString(),
  }
}

async function fetchRateToTwd(base: string): Promise<number> {
  const url = `${ER_API_BASE}/${encodeURIComponent(base)}`

  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error(`Network error fetching ${base}/TWD`)
  }

  if (!response.ok) {
    throw new Error(`Exchange rate API ${response.status} for ${base}/TWD`)
  }

  const data = (await response.json()) as ErApiResponse
  const hasValidPayload = data.result === 'success' || !!data.rates
  if (!hasValidPayload) {
    throw new Error(`Invalid exchange rate payload for ${base}/TWD`)
  }

  const rate = data.rates?.TWD
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Missing TWD rate for ${base}`)
  }

  return rate
}

export async function fetchLatestExchangeRatesToTwd(): Promise<ExchangeRatesToTwd> {
  const fetchedAt = new Date().toISOString()

  try {
    const [jpyToTwdRate, usdToTwdRate] = await Promise.all([
      fetchRateToTwd('JPY'),
      fetchRateToTwd('USD'),
    ])

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
