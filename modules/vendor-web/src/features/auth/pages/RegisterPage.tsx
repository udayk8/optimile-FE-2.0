import { useNavigate } from 'react-router-dom'
import { Button } from '@vendor/components/ui/button'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Truck, ArrowRight, ShieldAlert } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4">
      <Card className="w-full max-w-lg border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl text-white">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Vendor Registration Disabled</h1>
            <p className="text-blue-200 mt-2">
              Vendors are pre-registered by operations. Use login and then complete onboarding in the portal.
            </p>
          </div>

          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                Self-registration is not available in this portal. New vendor accounts must be created outside the portal.
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button type="button" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => navigate('/login')}>
              <ArrowRight className="mr-2 h-4 w-4" /> Go to login
            </Button>
            <span className="text-xs text-blue-200/70">No portal sign-up flow</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
