import type { Expense, Member, SettlementItem } from '../types'

export type CurrencyFilter = 'TWD' | 'JPY' | 'USD' | 'ALL'

export const OVERVIEW_CURRENCIES: { value: CurrencyFilter; label: string }[] = [
  { value: 'TWD', label: 'TWD' },
  { value: 'JPY', label: 'JPY' },
  { value: 'USD', label: 'USD' },
  { value: 'ALL', label: '全部' },
]

export function currencyDecimals(currency: string): number {
  const c = currency.toUpperCase()
  if (c === 'TWD' || c === 'JPY' || c === 'KRW') return 0
  return 2
}

export function roundAmount(n: number, currency: string): number {
  const decimals = currencyDecimals(currency)
  const p = 10 ** decimals
  return Math.round((n + Number.EPSILON) * p) / p
}

function isZero(n: number, currency: string): boolean {
  const decimals = currencyDecimals(currency)
  const eps = 0.5 / 10 ** decimals
  return Math.abs(n) < eps
}

export function formatAmount(amount: number, currency: string): string {
  const decimals = currencyDecimals(currency)
  const rounded = roundAmount(Math.abs(amount), currency)
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function filterExpensesByCurrency(expenses: Expense[], currencyFilter: CurrencyFilter): Expense[] {
  if (currencyFilter === 'ALL') return expenses
  return expenses.filter((exp) => (exp.currency || '').toUpperCase() === currencyFilter)
}

function getCurrenciesFromExpenses(expenses: Expense[], currencyFilter: CurrencyFilter): string[] {
  const filtered = filterExpensesByCurrency(expenses, currencyFilter)
  const set = new Set<string>()
  for (const exp of filtered) {
    const currency = (exp.currency || '').toUpperCase()
    if (currency) set.add(currency)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

function initMemberBalances(members: Member[]): Record<string, number> {
  const balances: Record<string, number> = {}
  for (const member of members) balances[member.id] = 0
  return balances
}

function applyExpenseToBalances(
  balances: Record<string, number>,
  exp: Expense,
  currency: string,
): void {
  const amount = Number(exp.amount)
  if (!Number.isFinite(amount) || isZero(amount, currency)) return

  if (exp.type === 'transfer') {
    const payerId = exp.payerId
    const receiverId = exp.receiverId
    if (!payerId || !receiverId) return
    balances[payerId] = (balances[payerId] ?? 0) + amount
    balances[receiverId] = (balances[receiverId] ?? 0) - amount
    return
  }

  const payerId = exp.payerId
  const participants = exp.participantIds?.filter(Boolean) ?? []
  if (!payerId || participants.length === 0) return

  const share = amount / participants.length
  balances[payerId] = (balances[payerId] ?? 0) + amount
  for (const participantId of participants) {
    balances[participantId] = (balances[participantId] ?? 0) - share
  }
}

function finalizeBalances(balances: Record<string, number>, currency: string): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [id, value] of Object.entries(balances)) {
    const rounded = roundAmount(value, currency)
    result[id] = isZero(rounded, currency) ? 0 : rounded
  }
  return result
}

export function calculateBalances(
  expenses: Expense[],
  members: Member[],
  currencyFilter: CurrencyFilter = 'ALL',
): Record<string, Record<string, number>> {
  const filtered = filterExpensesByCurrency(expenses, currencyFilter)
  const currencies = getCurrenciesFromExpenses(filtered, 'ALL')
  const result: Record<string, Record<string, number>> = {}

  for (const currency of currencies) {
    const balances = initMemberBalances(members)
    const list = filtered.filter((exp) => (exp.currency || '').toUpperCase() === currency)
    for (const exp of list) applyExpenseToBalances(balances, exp, currency)
    result[currency] = finalizeBalances(balances, currency)
  }

  return result
}

export function calculateMyBalance(
  expenses: Expense[],
  members: Member[],
  memberId: string,
  currencyFilter: CurrencyFilter = 'TWD',
): { currency: string; balance: number }[] {
  const allBalances = calculateBalances(expenses, members, currencyFilter)
  return Object.entries(allBalances)
    .map(([currency, balances]) => ({
      currency,
      balance: balances[memberId] ?? 0,
    }))
    .filter(({ balance, currency }) => !isZero(balance, currency))
}

export function calculateMyTotalCost(
  expenses: Expense[],
  memberId: string,
  currencyFilter: CurrencyFilter = 'TWD',
): { currency: string; total: number }[] {
  const filtered = filterExpensesByCurrency(expenses, currencyFilter)
  const totals: Record<string, number> = {}

  for (const exp of filtered) {
    if (exp.type !== 'expense') continue
    const currency = (exp.currency || '').toUpperCase()
    if (!currency) continue

    const participants = exp.participantIds?.filter(Boolean) ?? []
    if (!participants.includes(memberId)) continue

    const amount = Number(exp.amount)
    if (!Number.isFinite(amount) || participants.length === 0) continue

    const share = amount / participants.length
    totals[currency] = (totals[currency] ?? 0) + share
  }

  return Object.entries(totals)
    .map(([currency, total]) => ({
      currency,
      total: roundAmount(total, currency),
    }))
    .filter(({ total, currency }) => !isZero(total, currency))
    .sort((a, b) => a.currency.localeCompare(b.currency))
}

function minTransfersFromBalances(
  balances: Record<string, number>,
  currency: string,
): { fromId: string; toId: string; amount: number }[] {
  const creditors = Object.entries(balances)
    .filter(([, value]) => value > 0 && !isZero(value, currency))
    .map(([id, value]) => ({ id, amount: roundAmount(value, currency) }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = Object.entries(balances)
    .filter(([, value]) => value < 0 && !isZero(value, currency))
    .map(([id, value]) => ({ id, amount: roundAmount(-value, currency) }))
    .sort((a, b) => b.amount - a.amount)

  const transfers: { fromId: string; toId: string; amount: number }[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount)
    const amount = roundAmount(pay, currency)

    if (!isZero(amount, currency)) {
      transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amount })
    }

    debtors[i].amount = roundAmount(debtors[i].amount - amount, currency)
    creditors[j].amount = roundAmount(creditors[j].amount - amount, currency)

    if (isZero(debtors[i].amount, currency)) i++
    if (isZero(creditors[j].amount, currency)) j++
  }

  return transfers
}

export interface SettlementByCurrency {
  currency: string
  items: SettlementItem[]
  isBalanced: boolean
}

export function calculateSettlementTransfers(input: {
  members: Member[]
  expenses: Expense[]
}): SettlementByCurrency[] {
  const { members, expenses } = input
  const memberById = new Map(members.map((member) => [member.id, member]))
  const allBalances = calculateBalances(expenses, members, 'ALL')
  const results: SettlementByCurrency[] = []

  for (const [currency, balances] of Object.entries(allBalances)) {
    const transfers = minTransfersFromBalances(balances, currency)
    const items: SettlementItem[] = transfers
      .map((transfer) => ({
        fromId: transfer.fromId,
        from: memberById.get(transfer.fromId)?.nickname ?? '未知',
        toId: transfer.toId,
        to: memberById.get(transfer.toId)?.nickname ?? '未知',
        amount: transfer.amount,
        currency,
      }))
      .filter((item) => !isZero(item.amount, currency))

    results.push({ currency, items, isBalanced: items.length === 0 })
  }

  return results.sort((a, b) => a.currency.localeCompare(b.currency))
}

/** @deprecated Use calculateSettlementTransfers */
export function computeSettlementsByCurrency(input: {
  members: Member[]
  expenses: Expense[]
}): SettlementByCurrency[] {
  return calculateSettlementTransfers(input)
}
