import { useEffect } from 'react'
import { AppRouter } from '../router/AppRouter'
import { ToastProvider } from '../components/ui/Toast'
import i18next from '../i18n/i18n'
import { useAppStore } from '../store/useAppStore'
import '../styles/variables.css'
import '../styles/global.css'

export default function TmsDriverAppApp() {
  const language = useAppStore((state) => state.language)

  useEffect(() => {
    i18next.changeLanguage(language)
  }, [language])

  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  )
}
