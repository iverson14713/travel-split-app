import { TRIP_UNLOCK_PRICE_LABEL } from '../constants/freeLimits'
import { setTripPurchasedUnlocked } from './tripUnlockService'

/** iOS App Store 非消耗型商品 ID（正式 IAP 串接時使用） */
export const IOS_TRIP_UNLOCK_PRODUCT_ID = 'trip_unlock_single'

export interface TripUnlockRecord {
  trip_id: string
  transaction_id: string
  original_transaction_id: string
  product_id: string
  platform: 'ios'
  unlocked_at: string
  unlock_base_start_date?: string
  max_end_date?: string
  source?: 'mock' | 'ios_iap' | 'developer'
}

export type RestorePurchasesResult =
  | { status: 'not_available'; message: string }
  | { status: 'no_purchases'; message: string }
  | { status: 'success'; restoredTripIds: string[]; records: TripUnlockRecord[] }
  | { status: 'error'; message: string }

const IAP_NOT_AVAILABLE_MESSAGE =
  '正式購買功能尚未開放，之後可在這裡恢復已購買的旅程解鎖。'

/** 正式 StoreKit / Capacitor IAP 是否已串接 */
export function isIapAvailable(): boolean {
  return false
}

export interface StoreKitProduct {
  productId: string
  localizedPrice: string
}

/**
 * 向 StoreKit 取得商品資訊（含在地化價格字串）。
 * 正式 IAP 串接時實作 Capacitor In-App Purchase getProducts()。
 */
export async function fetchStoreKitProduct(
  productId: string,
): Promise<StoreKitProduct | null> {
  // TODO: Capacitor In-App Purchase getProducts([productId])
  void productId
  return null
}

/** 取得單趟解鎖商品的顯示價格；IAP 未串接時回傳 TRIP_UNLOCK_PRICE_LABEL */
export async function fetchTripUnlockProductPriceLabel(): Promise<string> {
  if (!isIapAvailable()) {
    return TRIP_UNLOCK_PRICE_LABEL
  }

  const product = await fetchStoreKitProduct(IOS_TRIP_UNLOCK_PRODUCT_ID)
  return product?.localizedPrice ?? TRIP_UNLOCK_PRICE_LABEL
}

/**
 * 將恢復的交易紀錄套用至本機解鎖狀態（使用 purchased unlock，非 mock）。
 * 未來可改為先寫入 Supabase trip_unlocks，再同步本機快取。
 */
export function applyRestoredUnlockRecords(records: TripUnlockRecord[]): string[] {
  const restoredTripIds: string[] = []

  for (const record of records) {
    if (!record.trip_id) continue
    setTripPurchasedUnlocked(record.trip_id, true, record.unlock_base_start_date)
    restoredTripIds.push(record.trip_id)
  }

  return [...new Set(restoredTripIds)]
}

/**
 * 未來：從 Supabase trip_unlocks 依 original_transaction_id 查詢已購買紀錄。
 *
 * 預期資料表欄位：
 * - trip_id
 * - transaction_id
 * - original_transaction_id
 * - product_id
 * - platform ('ios')
 * - unlocked_at
 * - unlock_base_start_date
 * - max_end_date
 * - source ('mock' | 'ios_iap' | 'developer')
 */
export async function fetchTripUnlocksByTransactions(
  _transactionIds: string[],
): Promise<TripUnlockRecord[]> {
  // TODO: query Supabase trip_unlocks when backend is ready
  return []
}

/**
 * 未來：呼叫 StoreKit 恢復購買 / 重新同步交易，回傳非消耗型商品交易。
 */
export async function syncStoreKitTransactions(): Promise<
  Array<{
    transactionId: string
    originalTransactionId: string
    productId: string
  }>
> {
  // TODO: Capacitor In-App Purchase / StoreKit restorePurchases()
  return []
}

/**
 * 恢復已購買的單趟旅程解鎖。
 *
 * 正式 IAP 流程（預留）：
 * 1. 呼叫 StoreKit 恢復購買 / 重新同步交易
 * 2. 篩選非消耗型商品（IOS_TRIP_UNLOCK_PRODUCT_ID）
 * 3. 取得 transactionId / originalTransactionId
 * 4. 對照 Supabase trip_unlocks（或本機快取）找出對應 trip_id
 * 5. 將對應旅程標記為 unlocked（setTripPurchasedUnlocked）
 */
export async function restorePurchases(): Promise<RestorePurchasesResult> {
  if (!isIapAvailable()) {
    return {
      status: 'not_available',
      message: IAP_NOT_AVAILABLE_MESSAGE,
    }
  }

  try {
    const transactions = await syncStoreKitTransactions()
    const unlockTransactions = transactions.filter(
      (tx) => tx.productId === IOS_TRIP_UNLOCK_PRODUCT_ID,
    )

    if (unlockTransactions.length === 0) {
      return {
        status: 'no_purchases',
        message: '沒有找到可恢復的旅程解鎖購買紀錄。',
      }
    }

    const transactionIds = unlockTransactions.flatMap((tx) => [
      tx.transactionId,
      tx.originalTransactionId,
    ])

    const records = await fetchTripUnlocksByTransactions(transactionIds)

    if (records.length === 0) {
      return {
        status: 'no_purchases',
        message: '沒有找到可恢復的旅程解鎖購買紀錄。',
      }
    }

    const restoredTripIds = applyRestoredUnlockRecords(records)

    return {
      status: 'success',
      restoredTripIds,
      records,
    }
  } catch {
    return {
      status: 'error',
      message: '恢復購買時發生錯誤，請稍後再試。',
    }
  }
}

export function getRestorePurchasesUserMessage(result: RestorePurchasesResult): string {
  switch (result.status) {
    case 'success':
      return restoredTripsMessage(result.restoredTripIds.length)
    default:
      return result.message
  }
}

function restoredTripsMessage(count: number): string {
  if (count === 0) return '沒有找到可恢復的旅程解鎖購買紀錄。'
  return `已恢復 ${count} 趟旅程的解鎖狀態。`
}
