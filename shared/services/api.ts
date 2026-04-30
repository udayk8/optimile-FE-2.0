// ============================================================
// api.ts — Typed re-export of the core HTTP client
// ============================================================
// Provides:
//   - `api`        — the apiClient instance (fetch-based, JWT auth, auto-refresh)
//   - `ApiResponse` — standard success envelope: { data, success, message }
//   - `ApiErrorBody` — standard error envelope: { error, code }
//   - `ApiError`   — thrown by apiClient on non-2xx responses
//
// Usage:
//   import { api, ApiResponse, ApiError } from '@shared/services/api';
//   const result = await api.get<ApiResponse<User[]>>('/api/v1/users');
// ============================================================

export { apiClient as api, ApiError } from './apiClient';

// ── Standard response envelope (matches Spring Boot ApiResponse<T>) ────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string;
}

// ── Standard error body (matches Spring Boot GlobalExceptionHandler) ───────────

export interface ApiErrorBody {
  error: string;
  code: string;
  message?: string;
  status?: number;
}

// ── Pagination wrapper (matches Spring Boot Page<T>) ──────────────────────────

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
