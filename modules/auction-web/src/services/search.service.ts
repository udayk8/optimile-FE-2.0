import apiClient from '@auction/lib/api-client'

export interface SearchResultItem {
  id: string
  title?: string
  vendorName?: string
  lane?: string
  type?: string
  status?: string
}

export interface SearchResponse {
  auctions: SearchResultItem[]
  contracts: SearchResultItem[]
}

export async function searchAuctionService(q: string): Promise<SearchResponse> {
  const res = await apiClient.get('/search', { params: { q } })
  return {
    auctions: res.data.auctions ?? [],
    contracts: res.data.contracts ?? [],
  }
}
