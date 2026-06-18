import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import type { Trip } from '../../types'
import type { ReloadOptions } from '../../hooks/useTrip'
import {
  formatDisplayRateValue,
  getRateUnitLabel,
  OTHER_RATE_CURRENCY_CODES,
  parseDisplayRateToTwd,
  PRIMARY_RATE_CURRENCY_CODES,
} from '../../constants/currencies'
import { fetchLatestExchangeRatesToTwd, FALLBACK_RATE_NOTICE } from '../../services/exchangeRateService'
import { updateExchangeRates } from '../../services/tripService'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'

interface ExchangeRateSettingsProps {
  trip: Trip
  tripId: string
  onReload: (options?: ReloadOptions) => Promise<void>
}

function buildDisplayValues(rates: Record<string, number>): Record<string, string> {
  const values: Record<string, string> = {}
  for (const code of [...PRIMARY_RATE_CURRENCY_CODES, ...OTHER_RATE_CURRENCY_CODES]) {
    values[code] = formatDisplayRateValue(code, rates[code] ?? 0)
  }
  return values
}

function stopClick(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
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
  const [showOther, setShowOther] = useState(false)
  const [savingRates, setSavingRates] = useState(false)
  const [refreshingRates, setRefreshingRates] = useState(false)
  const [rateError, setRateError] = useState('')
  const [rateNotice, setRateNotice] = useState('')

  const allCodes = useMemo(
    () => [...PRIMARY_RATE_CURRENCY_CODES, ...OTHER_RATE_CURRENCY_CODES],
    [],
  )

  useEffect(() => {
    setDisplayValues(buildDisplayValues(trip.exchangeRatesToTwd))
  }, [trip.exchangeRatesToTwd])

  const handleSaveRates = async (event: MouseEvent<HTMLButtonElement>) => {
    stopClick(event)
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
      await onReload({ silent: true })
    } catch (err) {
      setRateError(err instanceof Error ? err.message : '更新匯率失敗')
    } finally {
      setSavingRates(false)
    }
  }

  const handleRefreshRates = async (event: MouseEvent<HTMLButtonElement>) => {
    stopClick(event)
    if (refreshingRates || savingRates) return

    setRateError('')
    setRateNotice('')
    setRefreshingRates(true)

    try {
      const rates = await fetchLatestExchangeRatesToTwd()
      setDisplayValues(buildDisplayValues(rates.ratesToTwd))

      await updateExchangeRates(tripId, {
        exchangeRatesToTwd: rates.ratesToTwd,
        exchangeRateSource: rates.source,
        exchangeRateFetchedAt: rates.fetchedAt,
      })

      if (rates.source === 'fallback') {
        setRateNotice(`已更新目前匯率（${FALLBACK_RATE_NOTICE}）`)
      } else {
        setRateNotice('已更新目前匯率')
      }

      await onReload({ silent: true })
    } catch {
      setRateError('抓取匯率失敗，請稍後再試')
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

      {PRIMARY_RATE_CURRENCY_CODES.map((code) => (
        <RateInputRow
          key={code}
          code={code}
          value={displayValues[code] ?? ''}
          onChange={(value) => setDisplayValues((prev) => ({ ...prev, [code]: value }))}
        />
      ))}

      <div className="exchange-rate-collapse">
        <button
          type="button"
          className="exchange-rate-toggle"
          aria-expanded={showOther}
          onClick={(event) => {
            stopClick(event)
            setShowOther((v) => !v)
          }}
        >
          <span>其他幣別</span>
          <span className="exchange-rate-toggle-arrow" aria-hidden="true">
            {showOther ? '▲' : '▼'}
          </span>
        </button>

        {showOther && (
          <div className="exchange-rate-collapse-body">
            {OTHER_RATE_CURRENCY_CODES.map((code) => (
              <RateInputRow
                key={code}
                code={code}
                value={displayValues[code] ?? ''}
                onChange={(value) => setDisplayValues((prev) => ({ ...prev, [code]: value }))}
              />
            ))}
          </div>
        )}
      </div>

      {rateError && <p className="form-error-msg">{rateError}</p>}
      {rateNotice && <p className="settings-hint settings-notice">{rateNotice}</p>}
      <Button
        type="button"
        fullWidth
        onClick={handleSaveRates}
        disabled={savingRates || refreshingRates}
      >
        {savingRates ? '儲存中...' : '儲存匯率'}
      </Button>
      <Button
        type="button"
        fullWidth
        variant="outline"
        onClick={handleRefreshRates}
        disabled={savingRates || refreshingRates}
      >
        {refreshingRates ? '抓取中...' : '重新抓取目前匯率'}
      </Button>
    </Card>
  )
}
