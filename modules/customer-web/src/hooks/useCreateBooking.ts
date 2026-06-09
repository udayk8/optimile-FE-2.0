import { useState } from 'react'
import type { CustomerDataBridge } from '../integration/customer-data-bridge'

type CreateForm = {
  originAddressId: string
  destinationAddressId: string
  materialId: string
  quantity: string
  weight: string
  uom: string
  vehicleTypeId: string
  pickupDate: string
  goodsValue: string
  specialInstructions: string
}

const EMPTY_FORM: CreateForm = {
  originAddressId: '',
  destinationAddressId: '',
  materialId: '',
  quantity: '',
  weight: '',
  uom: '',
  vehicleTypeId: '',
  pickupDate: '',
  goodsValue: '',
  specialInstructions: '',
}

export function useCreateBooking(bridge: CustomerDataBridge | null) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [message, setMessage] = useState('')

  function submit(onCreated: (id: string) => void) {
    if (!bridge) return
    if (!form.originAddressId || !form.destinationAddressId || !form.materialId || !form.quantity || !form.weight) {
      setMessage('Please complete origin, destination, material, quantity and weight.')
      return
    }
    const material = bridge.materials.find((m) => m.id === form.materialId)
    const newId = bridge.createBooking({
      commercialType: 'SPOT',
      serviceType: 'FTL',
      contractRateType: 'PER_TRIP',
      originAddressId: form.originAddressId,
      destinationAddressId: form.destinationAddressId,
      materialId: form.materialId,
      quantity: Number(form.quantity) || 0,
      weight: Number(form.weight) || 0,
      uom: form.uom || material?.uom || 'NOS',
      weightUom: material?.weightUom ?? 'MT',
      vehicleTypeId: form.vehicleTypeId || null,
      pickupDate: form.pickupDate || null,
      pickupTime: null,
      goodsValue: form.goodsValue ? Number(form.goodsValue) : null,
      specialInstructions: form.specialInstructions || null,
      distanceKm: null,
      spotContractId: null,
      enteredRate: null,
      deviationRemark: null,
    })
    setForm(EMPTY_FORM)
    setMessage(`Booking ${newId} created and sent to operations.`)
    onCreated(newId)
  }

  return { form, setForm, message, submit }
}
