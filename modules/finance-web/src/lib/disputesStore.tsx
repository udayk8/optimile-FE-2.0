import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { DISPUTES } from '@finance/data/mock'

/* ============================================================
   Shared disputes store.
   Both customer disputes (raised in Debtors) and sub-vendor
   disputes (raised in Sub-Vendor) flow into one list that the
   central Disputes page lists & resolves — in real time.
   ============================================================ */

export interface Dispute {
  id: string
  kind?: 'customer' | 'subvendor'
  stage?: string
  resolution?: string
  [key: string]: any
}

interface DisputesContextValue {
  disputes: Dispute[]
  addDispute: (d: Dispute) => void
  resolveDispute: (id: string, how: 'accept' | 'reject') => void
}

const DisputesContext = createContext<DisputesContextValue | null>(null)

const SEED: Dispute[] = DISPUTES.map((d) => ({ kind: 'customer', ...d }))

export function DisputesProvider({ children }: { children: ReactNode }) {
  const [disputes, setDisputes] = useState<Dispute[]>(SEED)

  const addDispute = useCallback((d: Dispute) => {
    setDisputes((xs) => (xs.some((x) => x.id === d.id) ? xs : [{ stage: 'raised', ...d }, ...xs]))
  }, [])

  const resolveDispute = useCallback((id: string, how: 'accept' | 'reject') => {
    setDisputes((xs) =>
      xs.map((d) =>
        d.id === id
          ? {
              ...d,
              stage: 'resolved',
              resolution:
                how === 'accept'
                  ? d.kind === 'subvendor'
                    ? 'Dispute accepted — debit note will be issued to sub-vendor'
                    : 'Dispute accepted — credit note will be issued'
                  : 'Dispute rejected — invoice confirmed',
            }
          : d,
      ),
    )
  }, [])

  return (
    <DisputesContext.Provider value={{ disputes, addDispute, resolveDispute }}>
      {children}
    </DisputesContext.Provider>
  )
}

export function useDisputes(): DisputesContextValue {
  const ctx = useContext(DisputesContext)
  if (!ctx) throw new Error('useDisputes must be used within a DisputesProvider')
  return ctx
}
