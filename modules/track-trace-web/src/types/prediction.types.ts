export type DelayRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'

export interface DelayRiskScore {
  tripId: string
  riskLevel: DelayRiskLevel
  score: number
  predictedDelayMinutes: number
  reason: string
  confidence: 'Low' | 'Medium' | 'High'
  recommendedAction: string
}
