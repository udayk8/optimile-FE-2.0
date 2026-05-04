import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { CurrencyDisplay } from '@auction/components/shared/CurrencyDisplay'
import { StatusBadge } from '@auction/components/shared/StatusBadge'
import { useAppStore } from '@auction/stores/app.store'

export default function ContractsPage() {
  const { id } = useParams()
  const { contracts } = useAppStore()
  const [search, setSearch] = useState('')
  const selectedContract = contracts.find((item) => item.id === id) ?? contracts[0]

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return contracts.filter((contract) => {
      if (!query) return true
      return (
        contract.id.toLowerCase().includes(query) ||
        contract.vendorName.toLowerCase().includes(query) ||
        contract.lane.toLowerCase().includes(query)
      )
    })
  }, [contracts, search])

  return (
    <div>
      <HeroCard
        eyebrow="Contract Outputs"
        title="Contracts"
        subtitle="Contracts are created after auction awards. Use this tab to review R1/R2/R3 allocations, override reasons, rate units, and expiry."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader className="gap-4">
            <CardTitle>Contract Registry</CardTitle>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by contract, vendor, or lane" />
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredContracts.map((contract) => (
              <Link
                key={contract.id}
                to={`/auction/contracts/${contract.id}`}
                className={`block rounded-xl border p-4 transition hover:bg-[#F8FAFC] ${
                  contract.id === selectedContract?.id ? 'border-[#93C5FD] bg-[#EFF6FF]' : 'border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold">{contract.id}</span>
                  <StatusBadge status={contract.status} />
                </div>
                <p className="mt-2 text-sm text-[#0F172A]">{contract.vendorName}</p>
                <p className="mt-1 text-xs text-[#64748B]">{contract.lane} · {contract.allocationRank} · {contract.volumeAllocationPercent}%</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        {selectedContract && (
          <Card>
            <CardHeader className="space-y-0">
              <div>
                <CardTitle>{selectedContract.id}</CardTitle>
                <p className="mt-1 text-sm text-[#64748B]">{selectedContract.vendorName} · {selectedContract.contractType}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Lane</p>
                  <p className="mt-1 text-sm text-[#0F172A]">{selectedContract.lane}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Vehicle Type</p>
                  <p className="mt-1 text-sm text-[#0F172A]">{selectedContract.vehicleType}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Contracted Rate</p>
                  <div className="mt-1 text-sm text-[#0F172A]">
                    <CurrencyDisplay amount={selectedContract.contractedRate} /> / {selectedContract.rateUnit.replace('PER_', '').replace('_', ' ')}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Allocation</p>
                  <p className="mt-1 text-sm text-[#0F172A]">{selectedContract.allocationRank} · {selectedContract.volumeAllocationPercent}%</p>
                </div>
              </div>

              {selectedContract.r1OverrideReason && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Winner override reason</p>
                  <p className="mt-2 text-sm text-amber-900">{selectedContract.r1OverrideReason}</p>
                </div>
              )}

              <div className="rounded-xl border border-[#E5E7EB] p-4">
                <p className="text-sm font-semibold text-[#0F172A]">TMS Sync</p>
                <p className="mt-2 text-sm text-[#475569]">
                  {selectedContract.rateSyncedToTms ? 'Rates synced and available for downstream booking suggestion.' : 'Sync pending.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
