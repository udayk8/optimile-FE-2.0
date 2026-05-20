export interface VehiclePositionPayload {
  vehicleId: string
  lat: number
  lng: number
  speed: number
  status: string
  documentCompliance: 'Compliant' | 'Non-Compliant'
  updatedAt: string
}

interface WsMessage<TPayload> {
  payload: TPayload
  topic: string
}

type Handler<TPayload> = (message: WsMessage<TPayload>) => void

export const wsClient = {
  connect() {
    // WebSocket integration is optional in the current fleet-control rollout.
  },
  subscribe<TPayload>(_topic: string, _handler: Handler<TPayload>) {
    return () => {
      // No-op unsubscribe for the placeholder transport.
    }
  },
}
