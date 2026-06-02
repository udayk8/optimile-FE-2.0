import { useEffect, useMemo, useState } from "react"
import {
    X, Truck, User, Phone, Gauge, Shield, Fuel, Wrench, Building2
} from "lucide-react"
import type { LucideIcon } from "lucide-react"


type DetailTab = "driver" | "vehicle"


export interface DriverDetail {
    name: string
    phone: string
    rating?: number
    experience?: string
    license?: string
    status: string
    dob?: string
    photoUrl?: string | null
    address?: string
    bloodGroup?: string
    licenseType?: string
    licenseExpiry?: string
    medicalExpiry?: string
    drugTestStatus?: string
    endorsements?: string[]
    assignedVehicle?: string
    vendorName?: string
    isActive?: boolean
}


export interface VehicleDetail {
    number: string
    model: string
    capacity?: string
    lastService?: string
    insurance?: string
    status: string
    speedCurrent?: string
    fuelLevel?: string
    make?: string
    year?: string
    vehicleType?: string
    fuelType?: string
    ownershipType?: string
    vendorName?: string
    chassisNo?: string
    insuranceNumber?: string
    insuranceExpiry?: string
    fitnessNumber?: string
    fitnessExpiry?: string
    pucNumber?: string
    pucExpiry?: string
    permitType?: string
    permitExpiry?: string
    odometer?: string
    isActive?: boolean
}


interface DriverVehicleModalProps {
    isOpen: boolean
    onClose: () => void
    driver: DriverDetail
    vehicle: VehicleDetail
    initialTab?: DetailTab
}


type DetailItem = {
    icon: LucideIcon
    label: string
    value?: string | number | null
    wide?: boolean
}


const emptyValue = "-"


const joinWithFallback = (...parts: (string | undefined | null)[]) => {
    const clean = parts.filter(Boolean)
    return clean.length ? clean.join(" · ") : undefined
}


function DetailGrid({ items, accent }: { items: DetailItem[]; accent: string }) {
    return (
        <div className="driver-vehicle-detail-grid">
            {items.map((item) => (
                <div key={`${item.label}-${String(item.value)}`} className={item.wide ? "detail-cell detail-cell-wide" : "detail-cell"}>
                    <item.icon size={17} color={accent} strokeWidth={1.9} />
                    <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                        <p style={{ margin: "5px 0 0", fontSize: 14, fontWeight: 750, color: "#0f172a", overflowWrap: "anywhere" }}>{item.value || emptyValue}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}


function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                flex: 1,
                minHeight: 42,
                borderRadius: 10,
                border: active ? "1px solid transparent" : "1px solid #e2e8f0",
                background: active ? "#4f46e5" : "#fff",
                color: active ? "#fff" : "#0f172a",
                fontWeight: 750,
                cursor: "pointer",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
            }}
        >
            <Icon size={16} />
            {label}
        </button>
    )
}


export function DriverVehicleModal({ isOpen, onClose, driver, vehicle, initialTab = "driver" }: DriverVehicleModalProps) {
    const [selectedTab, setSelectedTab] = useState<DetailTab>(initialTab)


    useEffect(() => {
        if (isOpen) setSelectedTab(initialTab)
    }, [initialTab, isOpen])


    const driverItems = useMemo<DetailItem[]>(() => [
        { icon: Phone, label: "Phone", value: driver.phone },
        { icon: Building2, label: "Vendor", value: driver.vendorName ?? "Own Fleet" },
    ], [driver])


    const vehicleItems = useMemo<DetailItem[]>(() => [
        { icon: Truck, label: "Registration", value: vehicle.number },
        { icon: Building2, label: "Manufacturer", value: vehicle.make },
        { icon: Wrench, label: "Model", value: joinWithFallback(vehicle.model, vehicle.year) },
        { icon: Gauge, label: "Vehicle Type", value: vehicle.vehicleType },
        { icon: Fuel, label: "Fuel Type", value: vehicle.fuelType },
        { icon: Shield, label: "Ownership", value: vehicle.ownershipType },
        { icon: Building2, label: "Vendor", value: vehicle.vendorName ?? (vehicle.ownershipType === "OWN" ? "Own Fleet" : undefined) },
    ], [vehicle])


    if (!isOpen) return null


    const isDriver = selectedTab === "driver"
    const accent = "#4f46e5"


    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2500, padding: 16 }}>
            <div style={{ width: "min(760px, 100%)", height: "min(680px, 88vh)", overflow: "hidden", borderRadius: 20, background: "#fff", boxShadow: "0 30px 80px rgba(2,6,23,0.42)", display: "flex", flexDirection: "column" }}>
                <style>{`
                   .driver-vehicle-detail-grid {
                       display: grid;
                       grid-template-columns: repeat(2, minmax(0, 1fr));
                       gap: 10px;
                   }
                   .detail-cell {
                       min-width: 0;
                       border: 1px solid #e2e8f0;
                       border-radius: 12px;
                       background: #f8fafc;
                       padding: 13px;
                       display: flex;
                       gap: 10px;
                       align-items: flex-start;
                   }
                   .detail-cell-wide { grid-column: 1 / -1; }
                   @media (max-width: 620px) {
                       .driver-vehicle-detail-grid { grid-template-columns: 1fr; }
                   }
               `}</style>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #e2e8f0", background: "#fff", zIndex: 1, flexShrink: 0 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 850, color: "#0f172a" }}>{isDriver ? "Driver Details" : "Vehicle Details"}</h2>
                        <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>TMS assignment and fleet master data</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close details" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 6 }}>
                        <X size={20} />
                    </button>
                </div>


                <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }}>
                    <TabButton active={selectedTab === "driver"} icon={User} label="Driver" onClick={() => setSelectedTab("driver")} />
                    <TabButton active={selectedTab === "vehicle"} icon={Truck} label="Vehicle" onClick={() => setSelectedTab("vehicle")} />
                </div>


                <div style={{ padding: 20, overflow: "auto", flex: 1 }}>
                    {isDriver ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div style={{ background: "linear-gradient(145deg, #17134a 0%, #312e81 58%, #1d4ed8 100%)", borderRadius: 16, padding: 20, color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}>
                                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                                        {driver.photoUrl ? <img src={driver.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={28} color="#c7d2fe" strokeWidth={1.6} />}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <h3 style={{ margin: 0, fontSize: 24, fontWeight: 850, overflowWrap: "anywhere" }}>{driver.name}</h3>
                                        <p style={{ margin: "5px 0 0", fontSize: 13, color: "rgba(255,255,255,0.78)" }}>Driver profile</p>
                                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                                            <span style={{ fontSize: 12, background: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 999 }}>{driver.status}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DetailGrid items={driverItems} accent="#4f46e5" />
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div style={{ background: "linear-gradient(145deg, #17134a 0%, #312e81 58%, #1d4ed8 100%)", borderRadius: 16, padding: 20, color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}>
                                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <Truck size={28} color="#c7d2fe" strokeWidth={1.6} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <h3 style={{ margin: 0, fontSize: 24, fontWeight: 850, fontFamily: "monospace", overflowWrap: "anywhere" }}>{vehicle.number}</h3>
                                        <p style={{ margin: "5px 0 0", fontSize: 13, color: "rgba(255,255,255,0.78)" }}>{joinWithFallback(vehicle.make, vehicle.model, vehicle.vehicleType) ?? "Vehicle master profile"}</p>
                                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                                            <span style={{ fontSize: 12, background: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 999 }}>{vehicle.status}</span>
                                            {vehicle.ownershipType ? <span style={{ fontSize: 12, background: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 999 }}>{vehicle.ownershipType}</span> : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DetailGrid items={vehicleItems} accent={accent} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}



