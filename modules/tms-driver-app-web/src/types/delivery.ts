export interface POD {
  recipientName: string;
  deliveredQuantity: number;
  uom: string;
  otpConfirmed: boolean;
  signatureCaptured: boolean;
  photos: string[];
  timestamp: string;
  gpsLocation: {
    lat: number;
    lng: number;
  };
  shortDeliveryNote?: string;
  damageNote?: string;
  remark: string;
}

export interface DeliveryDocuments {
  invoiceCopy: string | null;
  ewayBill: string | null;
  lrCopy: string | null;
}

export type DeliveryStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUB_DELIVERY_ACTIVE"
  | "POD_PENDING"
  | "DELIVERED"
  | "FAILED";

export interface SubDelivery {
  id: string;
  label: string;
  startAddress: string;
  startLat: number;
  startLng: number;
  confirmedAt: string;
}

export interface Delivery {
  id: string;
  label: string;
  location: string;
  lat: number;
  lng: number;
  consigneeName: string;
  consigneePhone: string;
  materialType: string;
  quantity: number;
  status: DeliveryStatus;
  subDeliveries: SubDelivery[];
  pod: POD | null;
  documents: DeliveryDocuments;
}
