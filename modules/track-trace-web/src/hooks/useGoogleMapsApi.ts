import { useEffect, useState } from 'react'

type GoogleMapsApiState = {
  isLoaded: boolean
  error: string | null
}

declare global {
  interface Window {
    google?: any
  }
}

const SCRIPT_ID = 'optimile-google-maps-script'

export function useGoogleMapsApi(apiKey?: string): GoogleMapsApiState {
  const [state, setState] = useState<GoogleMapsApiState>(() => ({
    isLoaded: Boolean(window.google?.maps),
    error: null,
  }))

  useEffect(() => {
    if (window.google?.maps) {
      setState({ isLoaded: true, error: null })
      return
    }

    if (!apiKey) {
      setState({ isLoaded: false, error: 'Google Maps API key is not configured.' })
      return
    }

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      const onLoad = () => setState({ isLoaded: true, error: null })
      const onError = () => setState({ isLoaded: false, error: 'Google Maps failed to load.' })
      existingScript.addEventListener('load', onLoad)
      existingScript.addEventListener('error', onError)
      return () => {
        existingScript.removeEventListener('load', onLoad)
        existingScript.removeEventListener('error', onError)
      }
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`

    const onLoad = () => setState({ isLoaded: true, error: null })
    const onError = () => setState({ isLoaded: false, error: 'Google Maps failed to load.' })

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
    document.head.appendChild(script)

    return () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }
  }, [apiKey])

  return state
}
