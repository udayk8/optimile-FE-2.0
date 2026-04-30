import { Navigate, useRoutes } from 'react-router-dom'
import { ProtectedRoute } from '@shared-auth'
import { Card, CardContent } from '@shared-ui/card'
import { PageHero } from '@shared-ui/page-hero'
import { Users } from 'lucide-react'
import '../styles/global.css'

export default function CustomerApp() {
  return useRoutes([
    {
      path: '/customer',
      element: (
        <ProtectedRoute portal="customer">
          <div className="min-h-screen bg-background px-4 py-6 text-text sm:px-6 lg:px-8">
            <main className="mx-auto max-w-5xl space-y-6">
              <PageHero
                eyebrow="CUSTOMER PORTAL"
                title="Customer Workspace"
                subtitle="Scaffold-only portal shell ready for customer module routes."
                icon={<Users className="h-5 w-5 text-primary" />}
              />

              <Card>
                <CardContent className="p-5">
                  <div className="space-y-2">
                    <h2 className="text-base font-bold text-text">Portal scaffold</h2>
                    <p className="max-w-2xl text-sm text-gray-600">
                      Customer modules are not implemented yet. This shell uses the shared Fleet design tokens and primitives so future customer pages start from the same layout, typography, and spacing system.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </ProtectedRoute>
      ),
    },
    { path: '*', element: <Navigate to="/customer" replace /> },
  ])
}
