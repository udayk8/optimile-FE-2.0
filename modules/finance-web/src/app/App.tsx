import { Navigate, Route, Routes } from 'react-router-dom'
import FinanceShell from './FinanceShell'
import { financeManifest } from './manifest'

// Standalone entry (npm run dev:finance:standalone). The original finance app
// had no auth, so standalone simply mounts FinanceShell at the module basePath.
// Tenant role / permission gating is applied in the embedded shell instead.
export default function App() {
  return (
    <Routes>
      <Route path={`${financeManifest.basePath}/*`} element={<FinanceShell />} />
      <Route path="*" element={<Navigate to={financeManifest.basePath} replace />} />
    </Routes>
  )
}
