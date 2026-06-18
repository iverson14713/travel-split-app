import { useEffect, useMemo, useState } from 'react'
import type { Trip } from '../../types'
import {
  COMMON_RATE_CURRENCY_CODES,
  formatDisplayRateValue,
  getRateUnitLabel,
  MORE_RATE_CURRENCY_CODES,
  parseDisplayRateToTwd,
} from '../../constants/currencies'
import { fetchLatestExchangeRatesToTwd, FALLBACK_RATE_NOTICE } from '../../services/exchangeRateService'
import { updateExchangeRates } from '../../services/tripService'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'

interface ExchangeRateSettingsProps {
  trip: Trip
  tripId: string
  onReload: () => Promise<void>
}

function buildDisplayValues(rates: Record<string, number>): Record<string, string> {
  const values: Record<string, string> = {}
  for (const code of [...COMMON_RATE_CURRENCY_CODES, ...MORE_RATE_CURRENCY_CODES]) {
    values[code] = formatDisplayRateValue(code, rates[code] ?? 0)
  }
  return values
}

function RateInputRow({
  code,
  value,
  onChange,
}: {
  code: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="exchange-rate-row">
      <span className="exchange-rate-label">{getRateUnitLabel(code)}</span>
      <Input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="exchange-rate-suffix">TWD</span>
    </div>
  )
}

export function ExchangeRateSettings({ trip, tripId, onReload }: ExchangeRateSettingsProps) {
  const [displayValues, setDisplayValues] = useState<Record<string, string>>(() =>
    buildDisplayValues(trip.exchangeRatesToTwd),
  )
  const [showMore, setShowMore] = useState(false)
  const [savingRates, setSavingRates] = useState(false)
  const [refreshingRates, setRefreshingRates] = useState(false)
  const [rateError, setRateError] = useState('')
  const [rateNotice, setRateNotice] = useState('')

  const allCodes = useMemo(
    () => [...COMMON_RATE_CURRENCY_CODES, ...MORE_RATE_CURRENCY_CODES],
    [],
  )

  useEffect(() => {
    setDisplayValues(buildDisplayValues(trip.exchangeRatesToTwd))
  }, [trip.exchangeRatesToTwd])

  const handleSaveRates = async () => {
    setRateError('')
    setRateNotice('')

    const exchangeRatesToTwd: Record<string, number> = { TWD: 1, ...trip.exchangeRatesToTwd }

    for (const code of allCodes) {
      const parsed = parseFloat(displayValues[code] ?? '')
      const rate = parseDisplayRateToTwd(code, parsed)
      if (!Number.isFinite(rate) || rate <= 0) {
        setRateError(`請輸入有效的${code}匯率`)
        return
      }
      exchangeRatesToTwd[code] = rate
    }

    setSavingRates(true)
    try {
      await updateExchangeRates(tripId, { exchangeRatesToTwd })
      setRateNotice('匯率已儲存。已建立的舊支出不會自動改變。')
      await onReload()
    } catch (err) {
      setRateError(err instanceof Error ? err.message : '更新匯率失敗')
    } finally {
      setSavingRates(false)
    }
  }

  const handleRefreshRates = async () => {
    setRateError('')
    setRateNotice('')
    setRefreshingRates(true)
    try {
      const rates = await fetchLatestExchangeRatesToTwd()
      await updateExchangeRates(tripId, {
        exchangeRatesToTwd: rates.ratesToTwd,
        exchangeRateSource: rates.source,
        exchangeRateFetchedAt: rates.fetchedAt,
      })
      if (rates.source === 'fallback') {
        setRateNotice(`${FALLBACK_RATE_NOTICE}。已建立的舊支出不會自動改變。`)
      } else {
        setRateNotice('已更新估算匯率。已建立的舊支出不會自動改變。')
      }
      await onReload()
    } catch (err) {
      setRateError(err instanceof Error ? err.message : '重新抓取匯率失敗')
    } finally {
      setRefreshingRates(false)
    }
  }

  return (
    <Card className="settings-card">
      <p className="settings-hint">
        台幣金額會依每筆記帳當下的匯率估算。
        <br />
        已建立的舊支出不會自動改變。
      </p>
      <div className="settings-row">
        <span className="settings-label">基準幣別</span>
        <span className="settings-value">TWD 台幣</span>
      </div>

      {COMMON_RATE_CURRENCY_CODES.map((code) => (
        <RateInputRow
          key={code}
          code={code}
          value={displayValues[code] ?? ''}
          onChange={(value) => setDisplayValues((prev) => ({ ...prev, [code]: value }))}
        />
      ))}

      <button type="button" className="exchange-rate-toggle" onClick={() => setShowMore((v) => !v)}>
        {showMore ? '收合更多幣別 ▴' : '更多幣別 ▾'}
      </button>

      {showMore &&
        MORE_RATE_CURRENCY_CODES.map((code) => (
          <RateInputRow
            key={code}
            code={code}
            value={displayValues[code] ?? ''}
            onChange={(value) => setDisplayValues((prev) => ({ ...prev, [code]: value }))}
          />
        ))}

      {rateError && <p className="form-error-msg">{rateError}</p>}
      {rateNotice && <p className="settings-hint">{rateNotice}</p>}
      <Button fullWidth onClick={handleSaveRates} disabled={savingRates || refreshingRates}>
        {savingRates ? '儲存中...' : '儲存匯率'}
      </Button>
      <Button fullWidth variant="outline" onClick={handleRefreshRates} disabled={savingRates || refreshingRates}>
        {refreshingRates ? '抓取中...' : '重新抓取目前匯率'}
      </Button>
    </Card>
  )
}
