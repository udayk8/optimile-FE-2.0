import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronLeftCircle, ChevronRight, Search, ShieldCheck, Star } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'

type Partner = {
  id: string
  name: string
  rating: number
  interestRate: number
  processingTime: string
  advancePercentage: number
  minInvoiceValue: number
  supportedIndustries: string
}

const PAGE_SIZE = 4

const PARTNERS: Partner[] = [
  { id: 'nbfc-1', name: 'FinEdge Capital', rating: 4.9, interestRate: 12.5, processingTime: '24 hours', advancePercentage: 85, minInvoiceValue: 50000, supportedIndustries: 'Logistics, FMCG' },
  { id: 'nbfc-2', name: 'Prime Credit', rating: 4.8, interestRate: 13.2, processingTime: '36 hours', advancePercentage: 82, minInvoiceValue: 25000, supportedIndustries: 'Manufacturing, Retail' },
  { id: 'nbfc-3', name: 'Axis Finance', rating: 4.7, interestRate: 11.9, processingTime: '48 hours', advancePercentage: 80, minInvoiceValue: 75000, supportedIndustries: 'Industrial, Auto' },
  { id: 'nbfc-4', name: 'Tata Capital', rating: 4.6, interestRate: 12.1, processingTime: '30 hours', advancePercentage: 83, minInvoiceValue: 60000, supportedIndustries: 'E-commerce, FMCG' },
  { id: 'nbfc-5', name: 'Aditya Birla Finance', rating: 4.5, interestRate: 12.8, processingTime: '42 hours', advancePercentage: 81, minInvoiceValue: 40000, supportedIndustries: 'Textiles, Chemicals' },
  { id: 'nbfc-6', name: 'SMFG India', rating: 4.4, interestRate: 13.0, processingTime: '48 hours', advancePercentage: 79, minInvoiceValue: 30000, supportedIndustries: 'Distribution, Retail' },
]

export default function SelectNBFCPage() {
  const navigate = useNavigate()
  const { invoiceId } = useParams()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase()
    return PARTNERS.filter((partner) =>
      query
        ? [partner.name, partner.supportedIndustries].some((value) => value.toLowerCase().includes(query))
        : true,
    )
  }, [search])

  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedPartners = filteredPartners.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="FINANCE"
        title="Select NBFC Partner"
        subtitle={`Choose a partner for invoice ${invoiceId}.`}
        icon={<ShieldCheck className="h-6 w-6 text-primary" />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Eligible value</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹6.2L</div>
          <div className="mt-2 text-sm text-gray-500">Approved invoices eligible for funding.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Avg settlement</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">24-48h</div>
          <div className="mt-2 text-sm text-gray-500">Expected disbursement cycle.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Typical fee</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">1.3%</div>
          <div className="mt-2 text-sm text-gray-500">Indicative partner discounting fee.</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Partner comparison</h3>
            <p className="mt-1 text-sm text-gray-500">Table-driven partner list with ratings, rates, and selection CTA.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search partner or industry"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-white sm:w-[280px]"
              />
            </div>
            <Button variant="outline" onClick={() => navigate('/vendor/nbfc')}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to hub
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-bold">Partner</th>
                <th className="px-5 py-3 font-bold">Rating</th>
                <th className="px-5 py-3 font-bold">Interest</th>
                <th className="px-5 py-3 font-bold">Processing</th>
                <th className="px-5 py-3 font-bold">Advance</th>
                <th className="px-5 py-3 font-bold">Min value</th>
                <th className="px-5 py-3 font-bold">Industries</th>
                <th className="px-5 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedPartners.map((partner) => (
                <tr key={partner.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text">{partner.name}</span>
                      {partner.rating >= 4.8 && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Top rated</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="font-semibold text-text">{partner.rating}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-text">{partner.interestRate}% p.a.</td>
                  <td className="px-5 py-4 text-sm text-text">{partner.processingTime}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-emerald-600">Up to {partner.advancePercentage}%</td>
                  <td className="px-5 py-4 text-sm text-text">₹{partner.minInvoiceValue.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{partner.supportedIndustries}</td>
                  <td className="px-5 py-4 text-right">
                    <Button onClick={() => navigate(`/vendor/nbfc/apply/${invoiceId}/${partner.id}`)}>
                      Select Partner
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <span>
            Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredPartners.length)} of {filteredPartners.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              <ChevronLeftCircle className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="rounded-lg bg-gray-50 px-3 py-2 font-semibold text-text">
              Page {safePage} of {totalPages}
            </span>
            <Button variant="outline" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
