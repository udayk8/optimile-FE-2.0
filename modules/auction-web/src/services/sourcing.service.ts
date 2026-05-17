import apiClient from '@auction/lib/api-client'
import type { RfiType, RfqType } from '@auction/types'

// RFI
export async function fetchRfis(params?: { status?: string; search?: string }): Promise<RfiType[]> {
  const res = await apiClient.get('/rfis', { params })
  return res.data.map(mapRfi)
}

export async function fetchRfi(id: string): Promise<RfiType> {
  const res = await apiClient.get(`/rfis/${id}`)
  return mapRfi(res.data)
}

export async function createRfi(data: {
  title: string
  description: string
  deadline: string
  targetEmails: string[]
  messageToVendor?: string
  templateFileName?: string
}): Promise<RfiType> {
  const res = await apiClient.post('/rfis', data)
  return mapRfi(res.data)
}

export async function patchRfiStatus(id: string, status: string): Promise<RfiType> {
  const res = await apiClient.patch(`/rfis/${id}/status`, { status })
  return mapRfi(res.data)
}

// RFQ
export async function fetchRfqs(params?: { status?: string; search?: string }): Promise<RfqType[]> {
  const res = await apiClient.get('/rfqs', { params })
  return res.data.map(mapRfq)
}

export async function fetchRfq(id: string): Promise<RfqType> {
  const res = await apiClient.get(`/rfqs/${id}`)
  return mapRfq(res.data)
}

export async function createRfq(data: {
  title: string
  deadline: string
  targetEmails: string[]
  messageToVendor?: string
  templateFileName?: string
}): Promise<RfqType> {
  const res = await apiClient.post('/rfqs', data)
  return mapRfq(res.data)
}

export async function patchRfqStatus(id: string, status: string): Promise<RfqType> {
  const res = await apiClient.patch(`/rfqs/${id}/status`, { status })
  return mapRfq(res.data)
}

// Mappers (backend uses vendorTracking with status as string; frontend expects same shape)
function mapRfi(d: any): RfiType {
  return {
    id: d.id,
    title: d.title,
    description: d.description ?? '',
    deadline: d.deadline,
    status: d.status,
    targetEmails: d.targetEmails ?? [],
    messageToVendor: d.messageToVendor,
    templateFileName: d.templateFileName,
    vendorTracking: (d.vendorTracking ?? []).map((vt: any) => ({
      vendorIdOrEmail: vt.vendorIdOrEmail,
      name: vt.name,
      status: vt.status,
    })),
    createdAt: d.createdAt,
    createdBy: d.createdById ?? '',
  }
}

function mapRfq(d: any): RfqType {
  return {
    id: d.id,
    title: d.title,
    deadline: d.deadline,
    status: d.status,
    targetEmails: d.targetEmails ?? [],
    messageToVendor: d.messageToVendor,
    templateFileName: d.templateFileName,
    vendorTracking: (d.vendorTracking ?? []).map((vt: any) => ({
      vendorIdOrEmail: vt.vendorIdOrEmail,
      name: vt.name,
      status: vt.status,
    })),
    createdAt: d.createdAt,
    createdBy: d.createdById ?? '',
  }
}
