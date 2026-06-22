import { Capacitor } from '@capacitor/core'
import { TRIP_UNLOCK_PRICE_LABEL } from '../constants/freeLimits'
import {
  computeMaxEndDate,
  isTripMockUnlocked,
  isTripPurchasedUnlocked,
  mockUnlockTrip,
  setTripPurchasedUnlocked,
} from './tripUnlockService'
import {
  fetchTripUnlockByTransactionId,
  fetchTripUnlockByTripId,
  insertTripUnlock,
} from './tripUnlockRepository'

/** iOS App Store 消耗型商品 ID（須與 App Store Connect 一致） */
export const IOS_TRIP_UNLOCK_PRODUCT_ID = 'trip_unlock_pass'

/** App Store Connect 顯示名稱：單趟旅程解鎖 */
export const IOS_TRIP_UNLOCK_PRODUCT_NAME = '單趟旅程解鎖'

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

export type RestoreTripUnlockResult =
  | { status: 'success' }
  | { status: 'not_found'; message: string }
  | { status: 'error'; message: string }

export type PurchaseTripUnlockResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

const RESTORE_TRIP_NOT_FOUND_MESSAGE = '找不到此旅程的解鎖紀錄'
const RESTORE_TRIP_SUCCESS_MESSAGE = '已重新檢查此旅程的解鎖狀態。'
const PURCHASE_ERROR_MESSAGE = '購買失敗，請稍後再試'
const NETWORK_ERROR_MESSAGE = '網路連線異常，請稍後再試'

let billingSupportedCache: boolean | null = null

function isNativeIos(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

async function loadNativePurchases() {
  if (!isNativeIos()) return null
  try {
    return await import('@capgo/native-purchases')
  } catch {
    return null
  }
}

/** 正式 StoreKit / Capacitor IAP 是否可用（僅 iOS 原生） */
export function isIapAvailable(): boolean {
  return isNativeIos()
}

export async function checkIapBillingSupported(): Promise<boolean> {
  if (!isNativeIos()) return false
  if (billingSupportedCache != null) return billingSupportedCache

  const mod = await loadNativePurchases()
  if (!mod) {
    billingSupportedCache = false
    return false
  }

  try {
    const { isBillingSupported } = await mod.NativePurchases.isBillingSupported()
    billingSupportedCache = isBillingSupported
    return isBillingSupported
  } catch {
    billingSupportedCache = false
    return false
  }
}

export interface StoreKitProduct {
  productId: string
  localizedPrice: string
  title: string
}

export async function fetchStoreKitProduct(
  productId: string,
): Promise<StoreKitProduct | null> {
  const mod = await loadNativePurchases()
  if (!mod || !(await checkIapBillingSupported())) return null

  try {
    const { product } = await mod.NativePurchases.getProduct({
      productIdentifier: productId,
      productType: mod.PURCHASE_TYPE.INAPP,
    })

    return {
      productId: product.identifier,
      localizedPrice: product.priceString,
      title: product.title,
    }
  } catch {
    return null
  }
}

export async function fetchTripUnlockProductPriceLabel(): Promise<string> {
  if (!isIapAvailable()) {
    return TRIP_UNLOCK_PRICE_LABEL
  }

  const product = await fetchStoreKitProduct(IOS_TRIP_UNLOCK_PRODUCT_ID)
  return product?.localizedPrice ?? TRIP_UNLOCK_PRICE_LABEL
}

function applyUnlockRecord(record: TripUnlockRecord): void {
  if (!record.trip_id) return
  setTripPurchasedUnlocked(record.trip_id, true, record.unlock_base_start_date)
}

export async function syncTripUnlockFromServer(tripId: string): Promise<boolean> {
  try {
    const record = await fetchTripUnlockByTripId(tripId)
    if (!record) return false
    applyUnlockRecord(record)
    return true
  } catch {
    return false
  }
}

async function finishIosTransaction(transactionId: string): Promise<void> {
  const mod = await loadNativePurchases()
  if (!mod) return

  await mod.NativePurchases.acknowledgePurchase({
    purchaseToken: transactionId,
  })
}

async function persistTripUnlock(
  tripId: string,
  unlockBaseStartDate: string,
  transactionId: string,
  originalTransactionId: string,
): Promise<TripUnlockRecord> {
  const existing = await fetchTripUnlockByTransactionId(transactionId)
  if (existing) {
    applyUnlockRecord(existing)
    return existing
  }

  const maxEndDate = computeMaxEndDate(unlockBaseStartDate)

  const record = await insertTripUnlock({
    tripId,
    transactionId,
    originalTransactionId,
    productId: IOS_TRIP_UNLOCK_PRODUCT_ID,
    unlockBaseStartDate,
    maxEndDate,
  })

  applyUnlockRecord(record)
  return record
}

function isPurchaseCancelledError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    /cancel/i.test(message) ||
    /user.*cancel/i.test(message) ||
    /payment.*cancel/i.test(message) ||
    /SKError.*2/.test(message)
  )
}

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /network/i.test(message) || /offline/i.test(message) || /timeout/i.test(message)
}

export async function purchaseTripUnlock(
  tripId: string,
  unlockBaseStartDate: string,
): Promise<PurchaseTripUnlockResult> {
  if (!isIapAvailable()) {
    return { status: 'error', message: '目前裝置不支援 App Store 購買' }
  }

  if (!(await checkIapBillingSupported())) {
    return { status: 'error', message: 'App Store 購買目前無法使用' }
  }

  const mod = await loadNativePurchases()
  if (!mod) {
    return { status: 'error', message: PURCHASE_ERROR_MESSAGE }
  }

  try {
    const transaction = await mod.NativePurchases.purchaseProduct({
      productIdentifier: IOS_TRIP_UNLOCK_PRODUCT_ID,
      productType: mod.PURCHASE_TYPE.INAPP,
      appAccountToken: tripId,
      quantity: 1,
      autoAcknowledgePurchases: false,
    })

    if (transaction.revocationDate) {
      return { status: 'error', message: PURCHASE_ERROR_MESSAGE }
    }

    await persistTripUnlock(
      tripId,
      unlockBaseStartDate,
      transaction.transactionId,
      transaction.transactionId,
    )

    await finishIosTransaction(transaction.transactionId)

    return { status: 'success' }
  } catch (error) {
    if (isPurchaseCancelledError(error)) {
      return { status: 'cancelled' }
    }
    if (isNetworkError(error)) {
      return { status: 'error', message: NETWORK_ERROR_MESSAGE }
    }
    return { status: 'error', message: PURCHASE_ERROR_MESSAGE }
  }
}

/**
 * iOS 走 App Store IAP（Consumable）；Web / 開發環境維持 mock unlock。
 */
export async function unlockTripWithPurchaseOrMock(
  tripId: string,
  unlockBaseStartDate: string,
): Promise<PurchaseTripUnlockResult> {
  if (await checkIapBillingSupported()) {
    return purchaseTripUnlock(tripId, unlockBaseStartDate)
  }

  mockUnlockTrip(tripId, unlockBaseStartDate)
  return { status: 'success' }
}

/**
 * 重新檢查目前旅程的解鎖狀態（Consumable 不依賴 Apple restore）。
 * 優先查 Supabase trip_unlocks，並保留本機 mock / purchased 快取。
 */
export async function restoreTripUnlock(tripId: string): Promise<RestoreTripUnlockResult> {
  if (!tripId) {
    return { status: 'not_found', message: RESTORE_TRIP_NOT_FOUND_MESSAGE }
  }

  try {
    const synced = await syncTripUnlockFromServer(tripId)
    if (synced) {
      return { status: 'success' }
    }

    if (isTripPurchasedUnlocked(tripId) || isTripMockUnlocked(tripId)) {
      return { status: 'success' }
    }

    return { status: 'not_found', message: RESTORE_TRIP_NOT_FOUND_MESSAGE }
  } catch {
    return { status: 'error', message: NETWORK_ERROR_MESSAGE }
  }
}

export function getRestoreTripUnlockMessage(result: RestoreTripUnlockResult): string {
  switch (result.status) {
    case 'success':
      return RESTORE_TRIP_SUCCESS_MESSAGE
    case 'not_found':
      return result.message
    default:
      return result.message
  }
}
