import {
  getAuthMode,
  getSelectedPortal,
  getSelectedRole,
  hasValidAuthState,
  type Portal,
} from '../utils/authStorage'

export function useLegacyAuth(portal?: Portal) {
  return {
    authMode: getAuthMode(),
    selectedPortal: getSelectedPortal(),
    selectedRole: getSelectedRole(),
    isValid: hasValidAuthState(portal),
  }
}
