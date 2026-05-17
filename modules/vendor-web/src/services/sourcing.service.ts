import { auctionClient } from '@vendor/lib/api-client'

export const SourcingService = {
  listAuctions: async (vendorId: string) =>
    (await auctionClient.get('/auctions', { params: { invitedVendorId: vendorId } })).data,
  getAuction: async (id: string) => (await auctionClient.get(`/auctions/${id}`)).data,
  getBids: async (auctionId: string, laneId: string) =>
    (await auctionClient.get(`/auctions/${auctionId}/lanes/${laneId}/bids`)).data,
  placeBid: async (
    auctionId: string,
    laneId: string,
    data: { vendorId: string; vendorName: string; amount: number },
  ) => (await auctionClient.post(`/auctions/${auctionId}/lanes/${laneId}/bids`, data)).data,
  listContracts: async (vendorId: string) =>
    (await auctionClient.get('/contracts', { params: { vendorId } })).data,
}
