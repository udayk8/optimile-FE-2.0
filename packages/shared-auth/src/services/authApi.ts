import { apiClient, ApiError } from './apiClient';

export interface AuthUserDto {
  id: string;
  internalId: string;
  tenantId: string;
  tenantInternalId: string;
  email: string;
  name: string;
  role: string;
  department: string;
  region: string | null;
  permissions: string[];
  modules: string[];
  status: string;
}

export interface AuthTenantDto {
  id: string;
  internalId: string;
  name: string;
  slug: string;
  modules: string[];
  status: string;
  createdAt: string;
}

export interface AuthTokenResponseDto {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: AuthUserDto;
  tenant: AuthTenantDto;
}

export interface MeResponseDto {
  user: AuthUserDto;
  tenant: AuthTenantDto;
}

interface LoginRequestDto {
  tenantId?: string;
  email: string;
  password: string;
  rememberMe?: boolean;
}

export const authApi = {
  async login(payload: LoginRequestDto): Promise<AuthTokenResponseDto> {
    try {
      return await apiClient.post<AuthTokenResponseDto>('/api/v1/auth/login', payload, { auth: false });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        return apiClient.post<AuthTokenResponseDto>('/auth/login', payload, { auth: false });
      }
      throw error;
    }
  },

  async me(): Promise<MeResponseDto> {
    try {
      return await apiClient.get<MeResponseDto>('/api/v1/auth/me');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        return apiClient.get<MeResponseDto>('/auth/me');
      }
      throw error;
    }
  },

  async logout(refreshToken?: string): Promise<void> {
    const payload = refreshToken ? { refreshToken } : undefined;
    try {
      await apiClient.post<void>('/api/v1/auth/logout', payload);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        await apiClient.post<void>('/auth/logout', payload);
        return;
      }
      throw error;
    }
  },

  async forgotPassword(email: string): Promise<void> {
    try {
      await apiClient.post<void>('/api/v1/auth/forgot-password', { email }, { auth: false });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        await apiClient.post<void>('/auth/forgot-password', { email }, { auth: false });
        return;
      }
      throw error;
    }
  },

  async resetPassword(payload: { token: string; newPassword: string }): Promise<void> {
    try {
      await apiClient.post<void>('/api/v1/auth/reset-password', payload, { auth: false });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) {
        await apiClient.post<void>('/auth/reset-password', payload, { auth: false });
        return;
      }
      throw error;
    }
  },
};
