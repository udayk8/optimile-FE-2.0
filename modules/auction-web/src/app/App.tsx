import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuctionRoutes } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App({ standalone = false }: { standalone?: boolean }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuctionRoutes standalone={standalone} />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
