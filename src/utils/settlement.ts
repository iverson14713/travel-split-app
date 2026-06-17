import type { Expense, Member, SettlementItem } from '../types'

function currencyDecimals(currency: string): number {
  const c = currency.toUpperCase()
  if (c === 'JPY' || c === 'KRW') return 0
  return 2
}

function roundTo(n: number, decimals: number): number {
  const p = 10 ** decimals
  return Math.round((n + Number.EPSILON) * p) / p
}

function isZero(n: number, decimals: number): boolean {
  const eps = 0.5 / 10 ** decimals
  return Math.abs(n) < eps
}

function minTransfersFromBalances(
  balances: Record<string, number>,
  decimals: number,
): { fromId: string; toId: string; amount: number }[] {
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0 && !isZero(v, decimals))
    .map(([id, v]) => ({ id, amount: roundTo(v, decimals) }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = Object.entries(balances)
    .filter(([, v]) => v < 0 && !isZero(v, decimals))
    .map(([id, v]) => ({ id, amount: roundTo(-v, decimals) }))
    .sort((a, b) => b.amount - a.amount)

  const transfers: { fromId: string; toId: string; amount: number }[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount)
    const amount = roundTo(pay, decimals)

    if (!isZero(amount, decimals)) {
      transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amount })
    }

    debtors[i].amount = roundTo(debtors[i].amount - amount, decimals)
    creditors[j].amount = roundTo(creditors[j].amount - amount, decimals)

    if (isZero(debtors[i].amount, decimals)) i++
    if (isZero(creditors[j].amount, decimals)) j++
  }

  return transfers
}

export interface SettlementByCurrency {
  currency: string
  items: SettlementItem[]
  isBalanced: boolean
}

export function computeSettlementsByCurrency(input: {
  members: Member[]
  expenses: Expense[]
}): SettlementByCurrency[] {
  const { members, expenses } = input
  const memberById = new Map(members.map((m) => [m.id, m]))

  const expensesByCurrency = new Map<string, Expense[]>()
  for (const exp of expenses) {
    const currency = (exp.currency || '').toUpperCase()
    if (!currency) continue
    const list = expensesByCurrency.get(currency) ?? []
    list.push(exp)
    expensesByCurrency.set(currency, list)
  }

  const results: SettlementByCurrency[] = []

  for (const [currency, list] of expensesByCurrency.entries()) {
    const decimals = currencyDecimals(currency)
    const balances: Record<string, number> = {}
    for (const m of members) balances[m.id] = 0

    for (const exp of list) {
      const amount = Number(exp.amount)
      if (!Number.isFinite(amount) || isZero(amount, decimals)) continue

      if (exp.type === 'transfer') {
        const payerId = exp.payerId
        const receiverId = exp.receiverId
        if (!payerId || !receiverId) continue
        balances[payerId] = (balances[payerId] ?? 0) + amount
        balances[receiverId] = (balances[receiverId] ?? 0) - amount
        continue
      }

      const payerId = exp.payerId
      const participants = exp.participantIds?.filter(Boolean) ?? []
      if (!payerId || participants.length === 0) continue

      const share = amount / participants.length
      balances[payerId] = (balances[payerId] ?? 0) + amount
      for (const pid of participants) {
        balances[pid] = (balances[pid] ?? 0) - share
      }
    }

    // Round balances to reduce floating errors
    for (const id of Object.keys(balances)) {
      balances[id] = roundTo(balances[id], decimals)
      if (isZero(balances[id], decimals)) balances[id] = 0
    }

    const transfers = minTransfersFromBalances(balances, decimals)

    const items: SettlementItem[] = transfers
      .map((t) => ({
        fromId: t.fromId,
        from: memberById.get(t.fromId)?.nickname ?? '未知',
        toId: t.toId,
        to: memberById.get(t.toId)?.nickname ?? '未知',
        amount: t.amount,
        currency,
      }))
      .filter((s) => !isZero(s.amount, decimals))

    const isBalanced = items.length === 0
    results.push({ currency, items, isBalanced })
  }

  return results.sort((a, b) => a.currency.localeCompare(b.currency))
}

