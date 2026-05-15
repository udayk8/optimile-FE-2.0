import apiClient from '../lib/api-client';
import { Invoice, Expense, ExceptionRecord, Dispute } from '../types';

export const FinanceService = {
  getInvoices: async () => {
    const response = await apiClient.get<Invoice[]>('/invoices');
    return response.data;
  },
  createInvoice: async (invoice: Partial<Invoice>) => {
    const response = await apiClient.post<Invoice>('/invoices', invoice);
    return response.data;
  },
  getExpenses: async () => {
    const response = await apiClient.get<Expense[]>('/expenses');
    return response.data;
  },
  createExpense: async (expense: Partial<Expense>) => {
    const response = await apiClient.post<Expense>('/expenses', expense);
    return response.data;
  }
};

export const SupportService = {
  getExceptions: async () => {
    const response = await apiClient.get<ExceptionRecord[]>('/exceptions');
    return response.data;
  },
  createException: async (record: Partial<ExceptionRecord>) => {
    const response = await apiClient.post<ExceptionRecord>('/exceptions', record);
    return response.data;
  },
  updateExceptionStatus: async (id: string, status: string) => {
    const response = await apiClient.put<ExceptionRecord>(`/exceptions/${id}/status?status=${status}`);
    return response.data;
  }
};
