import { useNavigate } from 'react-router-dom'
import { Button } from '@vendor/components/ui/button'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Truck, ArrowRight, ShieldAlert } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-text">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wide text-accent">Vendor Portal</p>
            <h1 className="mt-2 text-3xl font-extrabold text-text">Vendor Registration Disabled</h1>
            <p className="mt-2 text-sm text-gray-600">
              Vendors are pre-registered by operations. Use login to access the portal.
            </p>
          </div>

          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                Self-registration is not available in this portal. New vendor accounts must be created outside the portal.
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/login')}>
              <ArrowRight className="mr-2 h-4 w-4" /> Go to login
            </Button>
            <span className="text-xs text-gray-500">No portal sign-up flow</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
