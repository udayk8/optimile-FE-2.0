import { useRef, useState, useEffect, type ChangeEvent, type CSSProperties } from "react"
import { DirectionsRenderer, GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api"
import {
    type LucideIcon,
    Truck, Phone, MapPin, Navigation, Clock, User,
    PackageCheck, ShieldCheck, CheckCircle2, Circle,
    Zap, Upload, MessageSquare, Radio, Gauge, Route, Star,
    ArrowRight, ArrowLeft, Send, Package, AlertTriangle,
    Ruler, LockOpen, PackageX, Timer, FileCheck, CircleCheck,
    StickyNote, GitBranch, Ban, ThumbsUp, ChevronRight, Maximize2, Minimize2, X, FileText
} from "lucide-react"
import { DriverVehicleModal, type DriverDetail, type VehicleDetail } from "./modals/DriverVehicleModal"
import { PodUploadModal } from "./modals/PodUpload"

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""

const originPosition = { lat: 11.0259, lng: 76.9788 }
const currentPosition = { lat: 11.0204, lng: 77.0125 }
const destinationPosition = { lat: 11.0359, lng: 77.0411 }
const routePath = [originPosition, currentPosition, destinationPosition]

const mapOptions: google.maps.MapOptions = {
    clickableIcons: true,
    fullscreenControl: true,
    gestureHandling: "greedy",
    mapTypeControl: false,
    streetViewControl: true,
    zoomControl: true,
}

declare global {
    interface Window {
        gm_authFailure?: () => void
    }
}

const mockData = {
    lrNumber: "ER-DA/102847",
    vehicleNumber: "TN66AP9920",
    driverName: "Rajuuu",
    driverPhone: "+91 8870556900",
    customer: "Devi",
    origin: "Mettupalayam",
    originFull: "8W3Q+488, Mettupalayam, Tamil Nadu 641301",
    destination: "Chitrambalam Layout, Coimbatore",
    destinationFull: "2X9P+M6F, 173 New Street, Chitrambalam Layout",
    currentLocation: "Near Mettupalayam",
    status: "In Transit",
    eta: "27 May 2026 · 06:15 PM",
    arrivingIn: "1h 42m",
    lastUpdated: "2 mins ago",
    progress: 76,
    speed: "42 km/h",
    distance: "37.2 km",
}

const invoicePreviewSrc = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <rect width="900" height="1200" rx="34" fill="#f8fafc"/>
  <rect x="40" y="40" width="820" height="1120" rx="28" fill="#ffffff" stroke="#dbe4f0" stroke-width="4"/>
  <rect x="40" y="40" width="820" height="150" rx="28" fill="#312e81"/>
  <text x="82" y="105" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#ffffff">INVOICE</text>
  <text x="82" y="145" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#c7d2fe">Booking #5520 · ER-DA/102847</text>
  <rect x="82" y="230" width="310" height="110" rx="18" fill="#eef2ff"/>
  <rect x="82" y="370" width="736" height="24" rx="12" fill="#e2e8f0"/>
  <rect x="82" y="420" width="736" height="18" rx="9" fill="#eef2ff"/>
  <rect x="82" y="460" width="640" height="18" rx="9" fill="#eef2ff"/>
  <rect x="82" y="520" width="736" height="18" rx="9" fill="#eef2ff"/>
  <rect x="82" y="560" width="700" height="18" rx="9" fill="#eef2ff"/>
  <rect x="82" y="640" width="736" height="160" rx="22" fill="#f8fafc" stroke="#dbe4f0"/>
  <rect x="110" y="670" width="320" height="18" rx="9" fill="#dbe4f0"/>
  <rect x="110" y="710" width="520" height="18" rx="9" fill="#dbe4f0"/>
  <rect x="110" y="750" width="480" height="18" rx="9" fill="#dbe4f0"/>
  <rect x="82" y="860" width="360" height="120" rx="20" fill="#f5f3ff" stroke="#ddd6fe"/>
  <rect x="470" y="860" width="348" height="120" rx="20" fill="#f0fdf4" stroke="#bbf7d0"/>
  <text x="110" y="900" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#312e81">Consignee</text>
  <text x="110" y="935" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#64748b">Devi</text>
  <text x="498" y="900" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#15803d">Amount</text>
  <text x="498" y="935" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#64748b">₹ 12,480.00</text>
  <rect x="82" y="1040" width="736" height="44" rx="14" fill="#4f46e5"/>
  <text x="450" y="1069" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#ffffff">Preview Invoice</text>
</svg>`)}`

function parseDistanceKm(value: string) {
    const parsed = parseFloat(value.replace(/[^\d\.]/g, ""))
    return Number.isFinite(parsed) ? parsed : null
}

const initialRouteDistanceKm = parseDistanceKm(mockData.distance) || 0

const driverData: DriverDetail = {
    name: "Rajuuu",
    phone: "+91 2109210921",
    rating: 4.8,
    experience: "5 years",
    license: "TN3820120009920",
    status: "Active",
    dob: "1991-08-18",
    photoUrl: null,
    address: "Gandhipuram, Coimbatore, Tamil Nadu",
    bloodGroup: "O+",
    licenseType: "HMV",
    licenseExpiry: "2028-09-30",
    medicalExpiry: "2026-12-31",
    drugTestStatus: "CLEAR",
    endorsements: ["Long Haul", "Night Shift", "Container"],
    assignedVehicle: "TN66AP9920",
    vendorName: "Own Fleet",
    isActive: true,
}

const vehicleData: VehicleDetail = {
    number: "TN66AP9920",
    make: "Tata",
    model: "1212 Ex",
    year: "2022",
    vehicleType: "20FT Container",
    capacity: "5000 kg",
    lastService: "15 May 2026",
    insurance: "Valid until 30 Jun 2026",
    status: "In Transit",
    speedCurrent: "42 km/h",
    fuelLevel: "85%",
    fuelType: "DIESEL",
    ownershipType: "OWN",
    vendorName: "Own Fleet",
    chassisNo: "TN66-CHS-9920",
    insuranceNumber: "INS-TN-9920",
    insuranceExpiry: "2026-06-30",
    fitnessNumber: "FIT-TN-9920",
    fitnessExpiry: "2026-12-31",
    pucNumber: "PUC-TN-9920",
    pucExpiry: "2026-10-31",
    permitType: "National Permit",
    permitExpiry: "2027-01-31",
    odometer: "128450",
    isActive: true,
}

const timeline = [
    { label: "Booking Created", time: "26 May · 10:20 AM", done: true },
    { label: "Vehicle Assigned", time: "26 May · 11:45 AM", done: true },
    { label: "Picked Up", time: "27 May · 09:15 AM", done: true },
    { label: "In Transit", time: "27 May · 03:55 PM", active: true },
    { label: "Out for Delivery", time: "—", pending: true },
    { label: "Completed", time: "—", pending: true },
]

type TimelineStepState = { done?: boolean; active?: boolean; pending?: boolean }
type StatCardProps = { icon: LucideIcon; label: string; value: string; accent?: boolean; progress?: number }
type TravelMetrics = { eta: string; arrivingIn: string; distance: string; source: string }

// ─── Delivery Experience State Types ────────────────────────────────────────
type ReadinessOption = "ready" | "30min" | "closed" | "call" | ""
type DeliveryStatus = "accepted" | "remarks" | "partial" | "rejected" | ""
type ConcernKey = "pkg" | "wrong" | "qty" | "seal" | "partial" | "delay"

interface DeliveryFormState {
    readiness: ReadinessOption
    concerns: ConcernKey[]
    receivedQty: number
    damagedQty: number
    status: DeliveryStatus
    podFileName: string
    remarks: string
    driverRating: number
    driverAspects: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const RATING_WORDS = ["", "Poor", "Fair", "Good", "Great", "Excellent"]
const READINESS_OPTIONS: { val: ReadinessOption; label: string; note: string; color: string; bg: string }[] = [
    { val: "ready", label: "Ready to receive", note: "Dock is clear, team is present", color: "#16a34a", bg: "#f0fdf4" },
    { val: "30min", label: "Need 30 mins", note: "Clearing dock space, almost ready", color: "#d97706", bg: "#fffbeb" },
    { val: "closed", label: "Warehouse closed", note: "Need to reschedule arrival window", color: "#dc2626", bg: "#fef2f2" },
    { val: "call", label: "Call before arrival", note: "Driver should call 15 mins ahead", color: "#0284c7", bg: "#f0f9ff" },
]
const CONCERNS: { val: ConcernKey; label: string; sub: string; bg: string; color: string; Icon: LucideIcon }[] = [
    { val: "pkg", label: "Packaging damaged", sub: "Outer box/wrap", bg: "#fef3c7", color: "#d97706", Icon: Package },
    { val: "wrong", label: "Wrong material", sub: "SKU mismatch", bg: "#fee2e2", color: "#dc2626", Icon: AlertTriangle },
    { val: "qty", label: "Quantity mismatch", sub: "Count differs", bg: "#ede9fe", color: "#7c3aed", Icon: Ruler },
    { val: "seal", label: "Seal broken", sub: "Tamper evident", bg: "#fef3c7", color: "#d97706", Icon: LockOpen },
    { val: "partial", label: "Partial delivery", sub: "Some items missing", bg: "#e0f2fe", color: "#0284c7", Icon: PackageX },
    { val: "delay", label: "Vehicle delay", sub: "Arrived very late", bg: "#f1f5f9", color: "#64748b", Icon: Timer },
]
const STATUSES: { val: DeliveryStatus; label: string; desc: string; Icon: LucideIcon; selClass: string; iconBg: string; iconColor: string }[] = [
    { val: "accepted", label: "Accepted", desc: "All goods received in good condition", Icon: CircleCheck, selClass: "sel-accepted", iconBg: "#f0fdf4", iconColor: "#16a34a" },
    { val: "remarks", label: "With remarks", desc: "Accepted but noting an issue", Icon: StickyNote, selClass: "sel-remarks", iconBg: "#fffbeb", iconColor: "#d97706" },
    { val: "partial", label: "Partial accept", desc: "Some items accepted, some rejected", Icon: GitBranch, selClass: "sel-partial", iconBg: "#f0f9ff", iconColor: "#0284c7" },
    { val: "rejected", label: "Rejected", desc: "Cannot accept this shipment", Icon: Ban, selClass: "sel-rejected", iconBg: "#fef2f2", iconColor: "#dc2626" },
]
const DRIVER_ASPECTS = [
    "On-time arrival", "Careful handling", "Good communication",
    "Professional", "Helped unload", "Documents ready",
]

const inputStyle: CSSProperties = {
    height: 48, borderRadius: 12, border: "1px solid #e2e8f0",
    padding: "0 14px", fontSize: 14, outline: "none", width: "100%"
}
const bottomActionStyle: CSSProperties = {
    minHeight: 48, borderRadius: 16, border: "1px solid #e2e8f0",
    background: "#fff", display: "flex", alignItems: "center",
    justifyContent: "center", gap: 6, fontWeight: 600,
    fontSize: 12, color: "#0f172a", textDecoration: "none", cursor: "pointer"
}

const formatEta = (durationSeconds: number) => {
    const eta = new Date(Date.now() + durationSeconds * 1000)
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(eta)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Dot({ done, active, pending }: TimelineStepState) {
    if (done) return (
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 4px #d1fae5" }}>
            <CheckCircle2 size={14} color="#fff" strokeWidth={2.5} />
        </div>
    )
    if (active) return (
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 4px #e0e7ff" }}>
            <Radio size={13} color="#fff" strokeWidth={2.5} />
        </div>
    )
    return (
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f1f5f9", border: "2px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Circle size={10} color="#cbd5e1" strokeWidth={2} />
        </div>
    )
}

function StatCard({ icon: Icon, label, value, accent = false, progress = 0 }: StatCardProps) {
    return (
        <div className={accent ? "stat-card stat-card-accent" : "stat-card"} style={{ borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon size={14} color={accent ? "#d1fae5" : "#64748b"} strokeWidth={1.8} />
                <span style={{ fontSize: 11, fontWeight: 600, color: accent ? "rgba(255,255,255,0.72)" : "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: accent ? "#f8fafc" : "#0f172a", margin: 0 }}>{value}</p>
            {accent && (
                <div style={{ marginTop: 4 }}>
                    <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.12)", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)" }}>
                        <div style={{ height: "100%", width: `${progress}%`, borderRadius: 99, background: "linear-gradient(90deg, #10b981, #34d399)", transition: "width 1.2s ease", boxShadow: "0 0 12px rgba(52,211,153,0.35)" }} />
                    </div>
                    {/* <p style={{ fontSize: 11, color: "#6ee7b7", margin: "5px 0 0", fontWeight: 500 }}>{progress}% complete</p> */}
                </div>
            )}
        </div>
    )
}

function MapView({ arrivingIn, directions, isMapLoaded, loadError, mapAuthFailed, mapMode, progress, isFullscreen, onMapModeChange, onToggleFullscreen }: {
    arrivingIn: string; directions: google.maps.DirectionsResult | null
    isMapLoaded: boolean; loadError: Error | undefined; mapAuthFailed: boolean
    mapMode: "roadmap" | "satellite"
    progress: number
    isFullscreen: boolean
    onMapModeChange: (mode: "roadmap" | "satellite") => void
    onToggleFullscreen: () => void
}) {
    const [pulse, setPulse] = useState(true)
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)

    useEffect(() => {
        const t = setInterval(() => setPulse(p => !p), 2000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        if (mapInstance) {
            window.google.maps.event.trigger(mapInstance, "resize")
            mapInstance.setCenter(currentPosition)
        }
    }, [mapInstance, isFullscreen])

    const mapControlOverlay = (
        <>
            <div style={{ position: "absolute", top: 18, left: 18, zIndex: 4, display: "inline-flex", borderRadius: 16, background: "rgba(255,255,255,0.94)", border: "1px solid #e2e8f0", boxShadow: "0 14px 34px rgba(15,23,42,0.12)", padding: 4 }}>
                {(["roadmap", "satellite"] as const).map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => onMapModeChange(mode)}
                        style={{ border: "none", borderRadius: 12, padding: "9px 14px", background: mapMode === mode ? "linear-gradient(135deg,#4f46e5,#312e81)" : "transparent", color: mapMode === mode ? "#fff" : "#64748b", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                    >
                        {mode === "roadmap" ? "Map" : "Satellite"}
                    </button>
                ))}
            </div>
            <button type="button" onClick={onToggleFullscreen} style={{ position: "absolute", top: 18, right: 18, zIndex: 4, minHeight: 42, border: "1px solid #e2e8f0", borderRadius: 16, background: "rgba(255,255,255,0.94)", color: "#0f172a", boxShadow: "0 14px 34px rgba(15,23,42,0.12)", padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                {isFullscreen ? <Minimize2 size={16} strokeWidth={2.2} /> : <Maximize2 size={16} strokeWidth={2.2} />}
                {isFullscreen ? "Exit full screen" : "Full screen"}
            </button>
        </>
    )

    const mapFrameStyle: CSSProperties = {
        flex: 1,
        borderRadius: isFullscreen ? 22 : 16,
        background: "#f8fafc",
        position: isFullscreen ? "fixed" : "relative",
        inset: isFullscreen ? 0 : undefined,
        width: isFullscreen ? "100vw" : "100%",
        height: isFullscreen ? "100vh" : 470,
        overflow: "hidden",
        minHeight: isFullscreen ? "100vh" : 420,
        border: "1px solid #e2e8f0",
        zIndex: isFullscreen ? 4000 : undefined,
        boxShadow: isFullscreen ? "0 30px 90px rgba(15,23,42,0.35)" : undefined,
    }

    if (GOOGLE_MAPS_API_KEY && isMapLoaded && !loadError && !mapAuthFailed) {
        return (
            <div style={mapFrameStyle}>
                <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={currentPosition} zoom={13} options={{ ...mapOptions, mapTypeId: mapMode, fullscreenControl: false }} onLoad={(map) => setMapInstance(map)}>
                    {directions ? (
                        <DirectionsRenderer directions={directions} options={{ markerOptions: { visible: false }, polylineOptions: { strokeColor: "#4f46e5", strokeOpacity: 0.9, strokeWeight: 5 }, preserveViewport: true }} />
                    ) : (
                        <PolylineF path={routePath} options={{ strokeColor: "#4f46e5", strokeOpacity: 0.85, strokeWeight: 5 }} />
                    )}
                    <MarkerF position={originPosition} label="O" />
                    <MarkerF position={currentPosition} label="S" />
                    <MarkerF position={destinationPosition} label="D" />
                </GoogleMap>
                {mapControlOverlay}
                <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(255,255,255,0.95)", border: "1px solid #e2e8f0", borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                    <Clock size={12} color="#64748b" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#0f172a" }}>Arrives in {arrivingIn}</span>
                </div>
            </div>
        )
    }

    return (
        <div style={{ ...mapFrameStyle, background: mapMode === "satellite" ? "linear-gradient(145deg, #1e293b 0%, #334155 42%, #14532d 100%)" : "linear-gradient(145deg, #e8f4fd 0%, #f0f7ff 40%, #e2f0e8 100%)" }}>
            {mapControlOverlay}
            <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }} />
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.3 }} xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#94a3b8" strokeWidth="0.5" /></pattern></defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} viewBox="0 0 400 220" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#059669" stopOpacity="0.7" />
                        <stop offset={`${progress}%`} stopColor="#4f46e5" stopOpacity="0.9" />
                        <stop offset={`${Math.min(progress + 0.1, 100)}%`} stopColor="#cbd5e1" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.5" />
                    </linearGradient>
                </defs>
                <path d="M 50 170 Q 180 120 300 60" stroke="url(#routeGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />
                <circle cx="218" cy="113" r="6" fill="#4f46e5" opacity="0.9" />
                <circle cx="218" cy="113" r={pulse ? 14 : 10} fill="#4f46e5" opacity={pulse ? 0.15 : 0.08} style={{ transition: "all 1.5s ease" }} />
            </svg>
            <div style={{ position: "absolute", left: "10%", bottom: "24%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ background: "#059669", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(5,150,105,0.4)", border: "2px solid #fff" }}>
                    <div style={{ transform: "rotate(45deg)", display: "flex" }}><MapPin size={11} color="#fff" strokeWidth={2.5} /></div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}>Mettupalayam</div>
            </div>
            <div style={{ position: "absolute", right: "12%", top: "18%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ background: "#e11d48", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(225,29,72,0.4)", border: "2px solid #fff" }}>
                    <div style={{ transform: "rotate(45deg)", display: "flex" }}><Navigation size={11} color="#fff" strokeWidth={2.5} /></div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}>Coimbatore</div>
            </div>
            <div style={{ position: "absolute", left: "50%", top: "45%", transform: "translate(-50%, -50%)", background: "rgba(255,255,255,0.97)", border: "1px solid #e0e7ff", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(79,70,229,0.15)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Truck size={18} color="#fff" strokeWidth={1.8} />
                </div>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{mockData.vehicleNumber}</span>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: pulse ? "0 0 0 3px rgba(16,185,129,0.25)" : "none", transition: "box-shadow 1.5s ease" }} />
                    </div>
                    <p style={{ fontSize: 10, color: "#64748b", margin: 0 }}>Updated {mockData.lastUpdated} · {mockData.speed}</p>
                </div>
            </div>
            <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(255,255,255,0.95)", border: "1px solid #e2e8f0", borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                <Clock size={12} color="#64748b" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#0f172a" }}>Arrives in {arrivingIn}</span>
            </div>
        </div>
    )
}

// ─── Delivery Experience Stepper ─────────────────────────────────────────────

const STEP_NAMES = ["Arrival readiness", "Goods condition", "Confirm delivery", "Driver rating"]

function StepProgressBar({ currentStep }: { currentStep: number }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                {[1, 2, 3, 4].map((n, i) => (
                    <div key={n} style={{ display: "flex", alignItems: "center", flex: n < 4 ? 1 : "none" }}>
                        <div style={{
                            width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, fontSize: 11, fontWeight: 600,
                            background: n < currentStep ? "#4f46e5" : n === currentStep ? "#fff" : "#f1f5f9",
                            border: n <= currentStep ? "2px solid #4f46e5" : "2px solid #e2e8f0",
                            color: n < currentStep ? "#fff" : n === currentStep ? "#4f46e5" : "#94a3b8",
                            boxShadow: n === currentStep ? "0 0 0 4px rgba(79,70,229,0.12)" : "none",
                            transition: "all 0.3s"
                        }}>
                            {n < currentStep ? <CheckCircle2 size={12} strokeWidth={2.5} /> : n}
                        </div>
                        {i < 3 && (
                            <div style={{ flex: 1, height: 2, borderRadius: 2, marginLeft: 6, background: n < currentStep ? "#4f46e5" : "#e2e8f0", transition: "background 0.4s" }} />
                        )}
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Step {currentStep} of 4</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>{STEP_NAMES[currentStep - 1]}</span>
            </div>
        </div>
    )
}

function DeliveryExperience() {
    const podInputRef = useRef<HTMLInputElement>(null)
    const [step, setStep] = useState(1)
    const [submitted, setSubmitted] = useState(false)
    const [form, setForm] = useState<DeliveryFormState>({
        readiness: "",
        concerns: [],
        receivedQty: 0,
        damagedQty: 0,
        status: "",
        podFileName: "",
        remarks: "",
        driverRating: 0,
        driverAspects: [],
    })
    const [hoveredStar, setHoveredStar] = useState(0)

    const setReadiness = (val: ReadinessOption) => setForm(f => ({ ...f, readiness: val }))
    const toggleConcern = (val: ConcernKey) => setForm(f => ({
        ...f,
        concerns: f.concerns.includes(val) ? f.concerns.filter(c => c !== val) : [...f.concerns, val]
    }))
    const adjQty = (key: "receivedQty" | "damagedQty", delta: number) =>
        setForm(f => ({ ...f, [key]: Math.max(0, f[key] + delta) }))
    const setQty = (key: "receivedQty" | "damagedQty", value: number) =>
        setForm(f => ({ ...f, [key]: Math.max(0, value) }))
    const setStatus = (val: DeliveryStatus) => setForm(f => ({ ...f, status: val }))
    const setRating = (n: number) => setForm(f => ({ ...f, driverRating: n }))
    const toggleAspect = (a: string) => setForm(f => ({
        ...f,
        driverAspects: f.driverAspects.includes(a) ? f.driverAspects.filter(x => x !== a) : [...f.driverAspects, a]
    }))

    const sectionCard: CSSProperties = {
        background: "#fff",
        border: "0.5px solid #e8edf4",
        borderRadius: 18,
        padding: "18px 18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
    }
    const sectionLabel: CSSProperties = {
        fontSize: 10, fontWeight: 700, color: "#94a3b8",
        letterSpacing: "0.08em", textTransform: "uppercase",
    }
    const navBtn = (primary: boolean, disabled = false): CSSProperties => ({
        flex: 1, height: 48, borderRadius: 14, border: primary ? "none" : "1px solid #e2e8f0",
        background: primary ? (disabled ? "#e2e8f0" : "#4f46e5") : "#f8fafc",
        color: primary ? (disabled ? "#94a3b8" : "#fff") : "#0f172a",
        fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "all 0.2s",
    })

    if (submitted) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "32px 0 24px", textAlign: "center" }}>
                <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: "linear-gradient(145deg, #dcfce7, #bbf7d0)",
                    border: "2px solid #86efac",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 0 8px rgba(34,197,94,0.1)"
                }}>
                    <CheckCircle2 size={34} color="#16a34a" strokeWidth={2} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Feedback submitted!</h3>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.6, maxWidth: 280 }}>
                        Your delivery report for LR {mockData.lrNumber} has been recorded. The logistics team has been notified.
                    </p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {[
                        form.readiness && `Readiness: ${READINESS_OPTIONS.find(r => r.val === form.readiness)?.label}`,
                        form.concerns.length > 0 && `${form.concerns.length} issue${form.concerns.length > 1 ? "s" : ""} reported`,
                        `Received: ${form.receivedQty} units`,
                        form.damagedQty > 0 && `Damaged: ${form.damagedQty} units`,
                        form.status && `Status: ${STATUSES.find(s => s.val === form.status)?.label}`,
                        form.podFileName && "POD uploaded",
                        form.driverRating > 0 && `Driver: ${RATING_WORDS[form.driverRating]} (${form.driverRating}/5)`,
                    ].filter(Boolean).map((item, i) => (
                        <span key={i} style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                            {item as string}
                        </span>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => { setSubmitted(false); setStep(1); setForm({ readiness: "", concerns: [], receivedQty: 0, damagedQty: 0, status: "", podFileName: "", remarks: "", driverRating: 0, driverAspects: [] }) }}
                    style={{ padding: "10px 24px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                    Start over
                </button>
            </div>
        )
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Delivery Experience</h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Help us improve delivery operations</p>
            </div>

            <StepProgressBar currentStep={step} />

            {/* ── STEP 1: Arrival Readiness ─────────────────────────────────── */}
            {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "deSlideIn 0.3s ease" }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Are you ready to receive?</p>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Lets the driver know your dock status before arrival</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {READINESS_OPTIONS.map(opt => (
                            <button
                                key={opt.val}
                                type="button"
                                onClick={() => setReadiness(opt.val)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 14,
                                    padding: "14px 16px", borderRadius: 16, cursor: "pointer",
                                    border: form.readiness === opt.val ? `2px solid #4f46e5` : "1.5px solid #e2e8f0",
                                    background: form.readiness === opt.val ? "#eef2ff" : "#fff",
                                    transition: "all 0.18s", textAlign: "left",
                                }}
                            >
                                <div style={{
                                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                                    border: form.readiness === opt.val ? "5px solid #4f46e5" : "2px solid #cbd5e1",
                                    background: "#fff", transition: "all 0.18s",
                                }} />
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: opt.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <span style={{ fontSize: 18, color: opt.color }}>
                                        {opt.val === "ready" && "✓"}
                                        {opt.val === "30min" && "⏱"}
                                        {opt.val === "closed" && "✕"}
                                        {opt.val === "call" && "📞"}
                                    </span>
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: form.readiness === opt.val ? "#4338ca" : "#0f172a" }}>{opt.label}</div>
                                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{opt.note}</div>
                                </div>
                                {form.readiness === opt.val && (
                                    <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                                        <CheckCircle2 size={18} color="#4f46e5" strokeWidth={2.5} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button type="button" onClick={() => setStep(2)} disabled={!form.readiness} style={navBtn(true, !form.readiness)}>
                            Continue <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Goods Condition ───────────────────────────────────── */}
            {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "deSlideIn 0.3s ease" }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Goods condition on arrival</p>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Check and report the state of your shipment</p>
                    </div>

                    <div style={sectionCard}>
                        <p style={sectionLabel}>Any concerns with this shipment?</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {CONCERNS.map(c => {
                                const active = form.concerns.includes(c.val)
                                return (
                                    <button
                                        key={c.val}
                                        type="button"
                                        onClick={() => toggleConcern(c.val)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 12,
                                            padding: "13px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left",
                                            border: active ? "1.5px solid #4f46e5" : "1.5px solid #e2e8f0",
                                            background: active ? "#eef2ff" : "#fff",
                                            transition: "all 0.18s",
                                        }}
                                    >
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? "#e0e7ff" : c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
                                            <c.Icon size={17} color={active ? "#4f46e5" : c.color} strokeWidth={1.8} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: active ? "#4338ca" : "#0f172a", lineHeight: 1.3 }}>{c.label}</div>
                                            <div style={{ fontSize: 11, color: active ? "#6366f1" : "#94a3b8", marginTop: 1 }}>{c.sub}</div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                        {form.concerns.length === 0 && (
                            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>Select all that apply — or skip if none</p>
                        )}
                        {form.concerns.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#eef2ff", borderRadius: 10, padding: "8px 12px" }}>
                                <AlertTriangle size={13} color="#4f46e5" strokeWidth={2} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#4338ca" }}>{form.concerns.length} concern{form.concerns.length > 1 ? "s" : ""} selected</span>
                            </div>
                        )}
                    </div>

                    <div style={sectionCard}>
                        <p style={sectionLabel}>Quantity verification</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {(["receivedQty", "damagedQty"] as const).map(key => (
                                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                                        {key === "receivedQty" ? "Received qty" : "Damaged qty"}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                                        <button
                                            type="button"
                                            onClick={() => adjQty(key, -1)}
                                            style={{ width: 44, height: 48, border: "none", background: "#f8fafc", cursor: "pointer", fontSize: 22, fontWeight: 300, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                            aria-label={`Decrease ${key}`}
                                        >−</button>
                                        <input
                                            type="number"
                                            min={0}
                                            value={form[key]}
                                            onChange={e => setQty(key, Number(e.target.value))}
                                            style={{
                                                flex: 1,
                                                height: 48,
                                                border: "none",
                                                textAlign: "center",
                                                fontSize: 18,
                                                fontWeight: 700,
                                                color: key === "damagedQty" && form[key] > 0 ? "#dc2626" : "#0f172a",
                                                outline: "none",
                                                appearance: "textfield",
                                                MozAppearance: "textfield",
                                                WebkitAppearance: "none",
                                                background: "transparent",
                                            }}
                                            inputMode="numeric"
                                            aria-label={key === "receivedQty" ? "Received quantity" : "Damaged quantity"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => adjQty(key, 1)}
                                            style={{ width: 44, height: 48, border: "none", background: "#f8fafc", cursor: "pointer", fontSize: 22, fontWeight: 300, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                            aria-label={`Increase ${key}`}
                                        >+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button type="button" onClick={() => setStep(1)} style={navBtn(false)}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button type="button" onClick={() => setStep(3)} style={navBtn(true)}>
                            Continue <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 3: Confirm Delivery ─────────────────────────────────── */}
            {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "deSlideIn 0.3s ease" }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Confirm delivery</p>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Official acceptance status and proof of delivery</p>
                    </div>

                    <div style={sectionCard}>
                        <p style={sectionLabel}>Delivery status</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {STATUSES.map(s => {
                                const active = form.status === s.val
                                const borderColors: Record<string, string> = {
                                    accepted: "#16a34a", remarks: "#d97706", partial: "#0284c7", rejected: "#dc2626"
                                }
                                const bgColors: Record<string, string> = {
                                    accepted: "#f0fdf4", remarks: "#fffbeb", partial: "#f0f9ff", rejected: "#fef2f2"
                                }
                                return (
                                    <button
                                        key={s.val}
                                        type="button"
                                        onClick={() => setStatus(s.val)}
                                        style={{
                                            display: "flex", flexDirection: "column", gap: 8,
                                            padding: 14, borderRadius: 14, cursor: "pointer", textAlign: "left",
                                            border: active ? `2px solid ${borderColors[s.val]}` : "1.5px solid #e2e8f0",
                                            background: active ? bgColors[s.val] : "#fff",
                                            transition: "all 0.18s",
                                        }}
                                    >
                                        <div style={{ width: 34, height: 34, borderRadius: 10, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <s.Icon size={17} color={s.iconColor} strokeWidth={2} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.label}</div>
                                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
                                        </div>
                                        {active && (
                                            <div style={{ position: "absolute", top: 10, right: 10 }}>
                                                <CheckCircle2 size={15} color={borderColors[s.val]} strokeWidth={2.5} />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div style={sectionCard}>
                        <p style={sectionLabel}>Proof of delivery (POD)</p>
                        <input
                            ref={podInputRef}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            style={{ display: "none" }}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const file = e.target.files?.[0]
                                if (file) setForm(f => ({ ...f, podFileName: file.name }))
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => podInputRef.current?.click()}
                            style={{
                                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                                padding: "22px 16px", borderRadius: 14, cursor: "pointer",
                                border: form.podFileName ? "2px solid #16a34a" : "1.5px dashed #cbd5e1",
                                background: form.podFileName ? "#f0fdf4" : "#fafafa",
                                transition: "all 0.2s",
                            }}
                        >
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: form.podFileName ? "#dcfce7" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {form.podFileName
                                    ? <FileCheck size={22} color="#16a34a" strokeWidth={1.8} />
                                    : <Upload size={22} color="#94a3b8" strokeWidth={1.8} />
                                }
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: form.podFileName ? "#15803d" : "#475569" }}>
                                    {form.podFileName || "Tap to upload POD"}
                                </p>
                                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>
                                    {form.podFileName ? "Tap to replace" : "Photo, scan or PDF · Max 10MB"}
                                </p>
                            </div>
                        </button>
                    </div>

                    <div style={sectionCard}>
                        <p style={sectionLabel}>Remarks (optional)</p>
                        <textarea
                            value={form.remarks}
                            onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                            placeholder="Describe unloading issues, seal condition, temperature, damage details…"
                            style={{
                                width: "100%", minHeight: 90, resize: "none",
                                borderRadius: 12, border: "1px solid #e2e8f0",
                                padding: 12, fontSize: 13, outline: "none",
                                fontFamily: "inherit", lineHeight: 1.6, color: "#0f172a",
                                background: "#fff",
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button type="button" onClick={() => setStep(2)} style={navBtn(false)}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button type="button" onClick={() => setStep(4)} disabled={!form.status} style={navBtn(true, !form.status)}>
                            Continue <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 4: Driver Rating ────────────────────────────────────── */}
            {step === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "deSlideIn 0.3s ease" }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Rate your driver</p>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Help us maintain delivery quality standards</p>
                    </div>

                    <div style={{ ...sectionCard, alignItems: "center", padding: "24px 20px" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(145deg, #e0e7ff, #c7d2fe)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <User size={28} color="#4338ca" strokeWidth={1.5} />
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{mockData.driverName}</p>
                            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{mockData.vehicleNumber} · {mockData.origin} → Coimbatore</p>
                        </div>

                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: "16px 20px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                            <div style={{ display: "flex", gap: 10 }}>
                                {[1, 2, 3, 4, 5].map(star => {
                                    const lit = (hoveredStar || form.driverRating) >= star
                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredStar(star)}
                                            onMouseLeave={() => setHoveredStar(0)}
                                            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                                            style={{
                                                width: 50, height: 50, borderRadius: 14,
                                                border: lit ? "1.5px solid #f59e0b" : "1.5px solid #e2e8f0",
                                                background: lit ? "#fffbeb" : "#fff",
                                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                                transition: "all 0.15s",
                                                boxShadow: lit ? "0 4px 12px rgba(245,158,11,0.2)" : "none",
                                            }}
                                        >
                                            <Star
                                                size={22}
                                                color={lit ? "#f59e0b" : "#cbd5e1"}
                                                fill={lit ? (form.driverRating >= star ? "#f59e0b" : "#fcd34d") : "transparent"}
                                                strokeWidth={2}
                                            />
                                        </button>
                                    )
                                })}
                            </div>
                            {(hoveredStar || form.driverRating) > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                                        {hoveredStar || form.driverRating}/5
                                    </span>
                                    <span style={{
                                        fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
                                        background: (hoveredStar || form.driverRating) >= 4 ? "#d1fae5" : (hoveredStar || form.driverRating) === 3 ? "#dbeafe" : "#fee2e2",
                                        color: (hoveredStar || form.driverRating) >= 4 ? "#15803d" : (hoveredStar || form.driverRating) === 3 ? "#1d4ed8" : "#dc2626",
                                    }}>
                                        {RATING_WORDS[hoveredStar || form.driverRating]}
                                    </span>
                                </div>
                            )}
                            {!hoveredStar && !form.driverRating && (
                                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Tap to rate</p>
                            )}
                        </div>

                        {form.driverRating >= 3 && (
                            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, animation: "deSlideIn 0.25s ease" }}>
                                <p style={{ ...sectionLabel, margin: 0 }}>What stood out?</p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {DRIVER_ASPECTS.map(a => {
                                        const active = form.driverAspects.includes(a)
                                        return (
                                            <button
                                                key={a}
                                                type="button"
                                                onClick={() => toggleAspect(a)}
                                                style={{
                                                    padding: "9px 16px", borderRadius: 999, cursor: "pointer",
                                                    border: active ? "1.5px solid #4f46e5" : "1.5px solid #e2e8f0",
                                                    background: active ? "#eef2ff" : "#fff",
                                                    color: active ? "#4338ca" : "#475569",
                                                    fontSize: 13, fontWeight: 500, transition: "all 0.15s",
                                                }}
                                            >
                                                {active && <CheckCircle2 size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />}
                                                {a}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button type="button" onClick={() => setStep(3)} style={navBtn(false)}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button
                            type="button"
                            onClick={() => setSubmitted(true)}
                            style={{ ...navBtn(true), flex: 2 }}
                        >
                            <Send size={16} /> Submit feedback
                        </button>
                    </div>
                    {!form.driverRating && (
                        <button
                            type="button"
                            onClick={() => setSubmitted(true)}
                            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer", textDecoration: "underline", alignSelf: "center" }}
                        >
                            Skip driver rating
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

type RemarkKind =
    | "shipment_intact"
    | "shipment_damaged"
    | "partial_delivery"
    | "reject_material"
    | "extra_material_received"
    | "destination_changed"
    | "consignee_destination_changed"

const REMARK_TYPES: Array<{ value: RemarkKind; label: string; hint: string }> = [
    { value: "shipment_intact", label: "Shipment Intact", hint: "No issues found at delivery" },
    { value: "shipment_damaged", label: "Shipment Damaged", hint: "Damage seen or reported" },
    { value: "partial_delivery", label: "Partially Delivered", hint: "Only part of the shipment was received" },
    { value: "reject_material", label: "Reject Material", hint: "Consignee rejected some items" },
    { value: "extra_material_received", label: "Extra Material Received", hint: "More items received than expected" },
    { value: "destination_changed", label: "Destination changed", hint: "Delivery location needs updating" },
    { value: "consignee_destination_changed", label: "Consignee & destination changed", hint: "Both consignee and location changed" },
]

function AddRemarksModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean
    onClose: () => void
}) {
    const uploadInputRef = useRef<HTMLInputElement>(null)
    const [isMobile, setIsMobile] = useState(false)
    const [kind, setKind] = useState<RemarkKind>("shipment_intact")
    const [imageName, setImageName] = useState("")
    const [form, setForm] = useState({
        comments: "",
        description: "",
        location: "",
        originalQty: "300",
        undeliveredQty: "",
        rejectedQty: "",
        extraQty: "",
    })

    useEffect(() => {
        if (!isOpen) {
            setKind("shipment_intact")
            setImageName("")
            setForm({
                comments: "",
                description: "",
                location: "",
                originalQty: "300",
                undeliveredQty: "",
                rejectedQty: "",
                extraQty: "",
            })
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isOpen, onClose])

    useEffect(() => {
        const updateMobile = () => setIsMobile(window.innerWidth <= 600)
        updateMobile()
        window.addEventListener("resize", updateMobile)
        return () => window.removeEventListener("resize", updateMobile)
    }, [])

    useEffect(() => {
        if (!isOpen) return
        const scrollY = window.scrollY
        const previousBodyOverflow = document.body.style.overflow
        const previousHtmlOverflow = document.documentElement.style.overflow
        const previousBodyPosition = document.body.style.position
        const previousBodyTop = document.body.style.top
        const previousBodyWidth = document.body.style.width
        document.documentElement.style.overflow = "hidden"
        document.body.style.overflow = "hidden"
        document.body.style.position = "fixed"
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = "100%"
        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow
            document.body.style.overflow = previousBodyOverflow
            document.body.style.position = previousBodyPosition
            document.body.style.top = previousBodyTop
            document.body.style.width = previousBodyWidth
            window.scrollTo(0, scrollY)
        }
    }, [isOpen])

    if (!isOpen) return null

    const needsImage = kind === "shipment_damaged" || kind === "reject_material"
    const needsQuantity = kind === "partial_delivery" || kind === "reject_material" || kind === "extra_material_received"
    const needsLocation = kind === "destination_changed" || kind === "consignee_destination_changed"
    const titleByKind: Record<RemarkKind, string> = {
        shipment_intact: "Shipment intact",
        shipment_damaged: "Shipment damaged",
        partial_delivery: "Partially delivered",
        reject_material: "Reject material",
        extra_material_received: "Extra material received",
        destination_changed: "Destination changed",
        consignee_destination_changed: "Consignee & destination changed",
    }
    const selectedRemark = REMARK_TYPES.find((option) => option.value === kind)

    const fieldShell: CSSProperties = {
        display: "flex",
        flexDirection: "column",
        gap: 10,
    }

    const inputStyle: CSSProperties = {
        width: "100%",
        borderRadius: 14,
        border: "1px solid #d1d5db",
        padding: "13px 14px",
        fontSize: 14,
        color: "#0f172a",
        outline: "none",
        background: "#fff",
        fontFamily: "inherit",
    }

    const submit = () => {
        onClose()
    }

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: isMobile ? "stretch" : "center", background: isMobile ? "#fff" : "rgba(15,23,42,0.48)", backdropFilter: isMobile ? "none" : "blur(8px)", padding: isMobile ? 0 : 16 }} onClick={onClose}>
            <div
                className="tracking-panel remarks-modal-shell"
                style={{
                    width: isMobile ? "100vw" : "min(680px, 96vw)",
                    height: isMobile ? "100dvh" : "min(90vh, calc(100vh - 32px))",
                    maxHeight: isMobile ? "100dvh" : "90vh",
                    overflow: "hidden",
                    borderRadius: isMobile ? 0 : 22,
                    background: "#fff",
                    border: isMobile ? "none" : "1px solid rgba(226,232,240,0.95)",
                    boxShadow: isMobile ? "none" : "0 30px 80px rgba(15,23,42,0.28)",
                    display: "flex",
                    flexDirection: "column",
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <div style={{ padding: isMobile ? "18px 18px 14px" : "22px 22px 18px", borderBottom: "1px solid rgba(226,232,240,0.95)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, position: isMobile ? "sticky" : "relative", top: isMobile ? 0 : undefined, background: "rgba(255,255,255,0.98)", zIndex: 1 }}>
                    <div style={{ minWidth: 0 }}>
                        <div className="section-title" style={{ marginBottom: 8 }}>Remarks</div>
                        <h3 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>{titleByKind[kind]}</h3>
                        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b" }}>{selectedRemark?.hint}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close remarks modal" style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", minHeight: 38, padding: "0 8px", borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 6, flex: "0 0 auto", fontSize: 13, fontWeight: 800 }}>
                        {isMobile ? <><ArrowLeft size={18} strokeWidth={2.3} /> Close</> : <X size={24} strokeWidth={2.3} />}
                    </button>
                </div>

                <div style={{ padding: isMobile ? 18 : 22, display: "flex", flexDirection: "column", gap: 18, flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
                    <div style={fieldShell}>
                        <label style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>Remark type</label>
                        <select
                            value={kind}
                            onChange={(event) => setKind(event.target.value as RemarkKind)}
                            style={{ ...inputStyle, cursor: "pointer", appearance: "none", minHeight: 58, fontSize: 15 }}
                        >
                            {REMARK_TYPES.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {needsQuantity && (
                        <div className="remarks-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                            <div style={fieldShell}>
                                <label style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>Original quantity</label>
                                <input value={form.originalQty} readOnly style={{ ...inputStyle, minHeight: 58, background: "#f3f4f6", color: "#6b7280" }} />
                            </div>
                            {kind === "partial_delivery" && (
                                <div style={fieldShell}>
                                    <label style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>Undelivered quantity</label>
                                    <input
                                        value={form.undeliveredQty}
                                        onChange={(event) => setForm((current) => ({ ...current, undeliveredQty: event.target.value }))}
                                        placeholder="Enter"
                                        style={{ ...inputStyle, minHeight: 58 }}
                                        inputMode="numeric"
                                    />
                                </div>
                            )}
                            {kind === "reject_material" && (
                                <div style={fieldShell}>
                                    <label style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>Rejected quantity</label>
                                    <input
                                        value={form.rejectedQty}
                                        onChange={(event) => setForm((current) => ({ ...current, rejectedQty: event.target.value }))}
                                        placeholder="Enter"
                                        style={{ ...inputStyle, minHeight: 58 }}
                                        inputMode="numeric"
                                    />
                                </div>
                            )}
                            {kind === "extra_material_received" && (
                                <div style={fieldShell}>
                                    <label style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>Extra received quantity</label>
                                    <input
                                        value={form.extraQty}
                                        onChange={(event) => setForm((current) => ({ ...current, extraQty: event.target.value }))}
                                        placeholder="Enter"
                                        style={{ ...inputStyle, minHeight: 58 }}
                                        inputMode="numeric"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {needsLocation && (
                        <div style={fieldShell}>
                            <label style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>Location</label>
                            <textarea
                                value={form.location}
                                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                                placeholder="Enter"
                                style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                            />
                        </div>
                    )}

                    {needsImage && (
                        <div style={fieldShell}>
                            <label style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>Upload image</label>
                            <input
                                ref={uploadInputRef}
                                type="file"
                                accept=".png,.jpg,.jpeg,.webp,.pdf"
                                style={{ display: "none" }}
                                onChange={(event) => {
                                    const file = event.target.files?.[0]
                                    if (file) setImageName(file.name)
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => uploadInputRef.current?.click()}
                                style={{
                                    ...inputStyle,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    cursor: "pointer",
                                    color: imageName ? "#0f172a" : "#9ca3af",
                                    minHeight: 58,
                                }}
                            >
                                <span>{imageName || "Upload"}</span>
                                <Upload size={18} color="#6b7280" />
                            </button>
                        </div>
                    )}

                    <div style={fieldShell}>
                        <label style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>{kind === "shipment_intact" ? "Comments" : "Description"}</label>
                        <textarea
                            value={kind === "shipment_intact" ? form.comments : form.description}
                            onChange={(event) => {
                                const value = event.target.value
                                if (kind === "shipment_intact") setForm((current) => ({ ...current, comments: value }))
                                else setForm((current) => ({ ...current, description: value }))
                            }}
                            placeholder="Enter"
                            style={{ ...inputStyle, minHeight: 128, resize: "vertical" }}
                        />
                    </div>

                    {(kind === "shipment_intact" || kind === "destination_changed" || kind === "consignee_destination_changed") && (
                        <div style={fieldShell}>
                            <label style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>Additional comments</label>
                            <textarea
                                value={form.comments}
                                onChange={(event) => setForm((current) => ({ ...current, comments: event.target.value }))}
                                placeholder="Enter"
                                style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ padding: isMobile ? "16px 18px 18px" : "18px 22px 22px", borderTop: "1px solid rgba(226,232,240,0.95)", background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96))", flexShrink: 0 }}>
                    <button
                        type="button"
                        onClick={submit}
                        style={{
                            width: "100%",
                            minHeight: 56,
                            border: "none",
                            borderRadius: 16,
                            background: "linear-gradient(135deg, #312e81, #4f46e5)",
                            color: "#fff",
                            fontSize: 16,
                            fontWeight: 800,
                            cursor: "pointer",
                            boxShadow: "0 16px 30px rgba(49,46,129,0.24)",
                        }}
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    )
}

function InvoicePreviewModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean
    onClose: () => void
}) {
    if (!isOpen) return null

    return (
        <div className="invoice-modal-overlay" style={{ position: "fixed", inset: 0, zIndex: 3200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.52)", backdropFilter: "blur(8px)", padding: 16 }} onClick={onClose}>
            <div
                className="tracking-panel invoice-modal-shell"
                style={{
                    width: "min(900px, 96vw)",
                    maxHeight: "92vh",
                    overflow: "hidden",
                    borderRadius: 24,
                    background: "rgba(255,255,255,0.98)",
                    border: "1px solid rgba(226,232,240,0.95)",
                    boxShadow: "0 30px 80px rgba(15,23,42,0.28)",
                    display: "flex",
                    flexDirection: "column",
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="invoice-modal-header" style={{ padding: "22px 22px 18px", borderBottom: "1px solid rgba(226,232,240,0.95)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <div className="section-title" style={{ marginBottom: 8 }}>Invoice</div>
                        <h3 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>View invoice</h3>
                        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b" }}>Static preview for the current booking until backend invoice data is connected.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close invoice modal" style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
                        <X size={24} strokeWidth={2.3} />
                    </button>
                </div>

                <div className="invoice-modal-body" style={{ padding: 22, overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
                    <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid #dbe4f0", background: "#f8fafc", boxShadow: "0 18px 40px rgba(15,23,42,0.08)" }}>
                        <img src={invoicePreviewSrc} alt="Invoice preview" style={{ display: "block", width: "100%", height: "auto" }} />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ConsigneeTrackingPage() {
    const [selectedPodName, setSelectedPodName] = useState("")
    const [podCompleted, setPodCompleted] = useState(false)
    const [showPodSuccess, setShowPodSuccess] = useState(false)
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
    const [mapAuthFailed, setMapAuthFailed] = useState(false)
    const [mapMode, setMapMode] = useState<"roadmap" | "satellite">("roadmap")
    const [isMapFullscreen, setIsMapFullscreen] = useState(false)
    const [showInvoiceModal, setShowInvoiceModal] = useState(false)
    const [showDeliveryModal, setShowDeliveryModal] = useState(false)
    const [showPodModal, setShowPodModal] = useState(false)
    const [showDriverVehicleModal, setShowDriverVehicleModal] = useState(false)
    const [driverVehicleTab, setDriverVehicleTab] = useState<"driver" | "vehicle">("driver")
    const [travelMetrics, setTravelMetrics] = useState<TravelMetrics>({
        eta: mockData.eta,
        arrivingIn: mockData.arrivingIn,
        distance: mockData.distance,
        source: GOOGLE_MAPS_API_KEY ? "Waiting for Google Maps" : "Static estimate",
    })
    const progress = mockData.progress

    const { isLoaded: isMapLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY })

    useEffect(() => {
        window.gm_authFailure = () => {
            setMapAuthFailed(true)
            setTravelMetrics(c => ({ ...c, source: "Google Maps key is missing, invalid, or restricted" }))
        }
        return () => { window.gm_authFailure = undefined }
    }, [])

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY || mapAuthFailed || !isMapLoaded || loadError || !window.google?.maps) return
        let cancelled = false
        const service = new window.google.maps.DistanceMatrixService()
        service.getDistanceMatrix(
            { origins: [currentPosition], destinations: [destinationPosition], travelMode: window.google.maps.TravelMode.DRIVING, unitSystem: window.google.maps.UnitSystem.METRIC },
            (response, status) => {
                if (cancelled) return
                const element = response?.rows?.[0]?.elements?.[0]
                if (status !== window.google.maps.DistanceMatrixStatus.OK || element?.status !== "OK") {
                    setTravelMetrics(c => ({ ...c, source: "Static estimate" })); return
                }
                const durationSeconds = element.duration?.value ?? 0
                setTravelMetrics({ eta: durationSeconds ? formatEta(durationSeconds) : mockData.eta, arrivingIn: element.duration?.text ?? mockData.arrivingIn, distance: element.distance?.text ?? mockData.distance, source: "Google Distance Matrix" })
            }
        )
        return () => { cancelled = true }
    }, [isMapLoaded, loadError, mapAuthFailed])

    useEffect(() => {
        document.body.style.overflow = isMapFullscreen ? "hidden" : ""
        return () => {
            document.body.style.overflow = ""
        }
    }, [isMapFullscreen])

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY || mapAuthFailed || !isMapLoaded || loadError || !window.google?.maps) return
        let cancelled = false
        const service = new window.google.maps.DirectionsService()
        service.route(
            { origin: originPosition, destination: destinationPosition, waypoints: [{ location: currentPosition, stopover: true }], travelMode: window.google.maps.TravelMode.DRIVING },
            (result, status) => {
                if (cancelled) return
                setDirections(status === window.google.maps.DirectionsStatus.OK && result ? result : null)
            }
        )
        return () => { cancelled = true }
    }, [isMapLoaded, loadError, mapAuthFailed])

    const driverPhoneHref = `tel:${mockData.driverPhone.replace(/[^\d+]/g, "")}`
    const openDriverVehicleDetails = (tab: "driver" | "vehicle") => {
        setDriverVehicleTab(tab)
        setShowDriverVehicleModal(true)
    }
    const handlePodUploadClick = () => setShowPodModal(true)
    const handlePodComplete = (label: string) => {
        setSelectedPodName(label)
        setPodCompleted(true)
        setShowPodSuccess(true)
        window.setTimeout(() => setShowPodSuccess(false), 2600)
    }
    const activityTimeline = podCompleted
        ? timeline.map((item) => ({ ...item, done: true, active: false, pending: false, time: item.label === "Completed" ? "Just now" : item.time }))
        : timeline

    const handleMapModeChange = (mode: "roadmap" | "satellite") => setMapMode(mode)
    const handleMapToggleFullscreen = () => setIsMapFullscreen((current) => !current)
    return (
        <div style={{ minHeight: "100vh", overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "90px" }}>
            {isMapFullscreen && (
                <div style={{ position: "fixed", inset: 0, zIndex: 5000, background: "#fff" }}>
                    <MapView
                        arrivingIn={travelMetrics.arrivingIn}
                        directions={directions}
                        isMapLoaded={isMapLoaded}
                        loadError={loadError}
                        mapAuthFailed={mapAuthFailed}
                        mapMode={mapMode}
                        progress={progress}
                        isFullscreen
                        onMapModeChange={handleMapModeChange}
                        onToggleFullscreen={handleMapToggleFullscreen}
                    />
                </div>
            )}
            <DriverVehicleModal
                isOpen={showDriverVehicleModal}
                onClose={() => setShowDriverVehicleModal(false)}
                driver={driverData}
                vehicle={vehicleData}
                initialTab={driverVehicleTab}
            />
            <InvoicePreviewModal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} />
            <PodUploadModal
                isOpen={showPodModal}
                onClose={() => setShowPodModal(false)}
                consigneeName={mockData.customer}
                contactPhone={mockData.driverPhone}
                onComplete={handlePodComplete}
            />
            <AddRemarksModal isOpen={showDeliveryModal} onClose={() => setShowDeliveryModal(false)} />
            {showPodSuccess && (
                <div style={{ position: "fixed", top: 18, right: 18, zIndex: 3500, borderRadius: 16, background: "#fff", border: "1px solid #bbf7d0", boxShadow: "0 18px 50px rgba(15,23,42,0.18)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 size={16} color="#059669" strokeWidth={2.5} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#0f172a" }}>POD uploaded successfully</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Shipment marked as completed</p>
                    </div>
                </div>
            )}
            <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-y: auto; }
        @keyframes deSlideIn {
          0% { opacity: 0; transform: translateX(14px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .tracking-bg-orb {
          position: absolute; border-radius: 999px;
          filter: blur(18px); opacity: 0.55; pointer-events: none;
          animation: driftOrb 16s ease-in-out infinite;
        }
        .tracking-panel {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(226,232,240,0.95);
          box-shadow: 0 18px 60px rgba(15,23,42,0.08);
          animation: riseIn 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .tracking-panel-soft {
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.88));
        }
        .stat-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.88));
          border: 1px solid rgba(226,232,240,0.95);
          box-shadow: 0 12px 28px rgba(15,23,42,0.05);
          position: relative; overflow: hidden;
          animation: riseIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .stat-card::before {
          content: ""; position: absolute; inset: 0 auto auto 0;
          width: 100%; height: 1px;
          background: linear-gradient(90deg, rgba(79,70,229,0.22), rgba(16,185,129,0.14), transparent);
        }
        .stat-card-accent {
          background: radial-gradient(circle at top left, rgba(52,211,153,0.18), transparent 34%),
            linear-gradient(145deg, #081223 0%, #0f172a 55%, #1f2a44 100%);
          border: 1px solid rgba(30,41,59,0.9);
          box-shadow: 0 18px 40px rgba(15,23,42,0.24);
        }
        .metal-chip {
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(226,232,240,0.9);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
        }
        .hero-card {
          animation: riseIn 0.72s cubic-bezier(0.16, 1, 0.3, 1) both, heroBreath 7s ease-in-out infinite;
        }
        .floating-map { animation: riseIn 0.78s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .timeline-entry { animation: slideFade 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .status-pill { animation: softGlow 2.8s ease-in-out infinite; }
        .pod-banner { animation: bannerDrop 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .section-title {
          font-size: 11px; font-weight: 700; color: #94a3b8;
          letter-spacing: 0.08em; text-transform: uppercase;
        }
        .stats-row > div:nth-child(1) { animation-delay: 0.05s; }
        .stats-row > div:nth-child(2) { animation-delay: 0.12s; }
        .stats-row > div:nth-child(3) { animation-delay: 0.19s; }
        .stats-row > div:nth-child(4) { animation-delay: 0.26s; }
        .stats-row > div:nth-child(5) { animation-delay: 0.33s; }
        .track-grid > div:nth-child(1) { animation-delay: 0.18s; }
        .track-grid > div:nth-child(2) { animation-delay: 0.26s; }
        .track-grid > div:nth-child(3) { animation-delay: 0.34s; }
        @media (min-width: 901px) {
          .timeline-body {
            display: flex !important;
            flex-direction: column !important;
          }
          .timeline-list {
            flex: 1 !important;
          }
          .timeline-list .timeline-entry {
            flex: 1 1 0 !important;
            min-height: 0 !important;
          }
        }
        @keyframes riseIn {
          0% { opacity: 0; transform: translateY(16px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideFade {
          0% { opacity: 0; transform: translateX(12px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes driftOrb {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(10px, -12px, 0) scale(1.04); }
        }
        @keyframes heroBreath {
          0%, 100% { box-shadow: 0 22px 42px rgba(49,46,129,0.28); }
          50% { box-shadow: 0 28px 52px rgba(29,78,216,0.22); }
        }
        @keyframes softGlow {
          0%, 100% { box-shadow: 0 8px 20px rgba(16,185,129,0.14); transform: translateY(0); }
          50% { box-shadow: 0 12px 26px rgba(16,185,129,0.24); transform: translateY(-1px); }
        }
                .driver-card { position: relative; }
                .driver-card .view-btn { opacity: 0; transform: translateY(-6px); }
                .driver-card:hover .view-btn { opacity: 1; transform: translateY(0); }
        @keyframes bannerDrop {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media (prefers-reduced-motion: reduce) {
          .tracking-bg-orb, .tracking-panel, .stat-card, .hero-card,
          .floating-map, .timeline-entry, .status-pill, .pod-banner {
            animation: none !important;
          }
        }
        @media (max-width: 900px) {
          html, body { overflow-y: auto; }
          .tracking-root { height: auto !important; min-height: 100vh !important; overflow: visible !important; }
          .tracking-shell { height: auto !important; }
          .track-grid { grid-template-columns: 1fr !important; }
                /* Mobile: place Route above Driver, and move View button into flow */
                @media (max-width: 600px) {
                    .track-grid { grid-template-columns: 1fr !important; }
                    .driver-card { order: 2; }
                    .route-card { order: 1; }
                    .driver-card .view-btn { position: static !important; opacity: 1 !important; transform: none !important; margin-top: 12px; display: inline-flex !important; }
                }
          .stats-row { flex-wrap: wrap !important; }
          .stats-row > div { min-width: 140px !important; }
          .timeline-panel { overflow: visible !important; }
        }
        @media (max-width: 600px) {
          .tracking-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            padding: 14px !important;
          }
          .tracking-header-main {
            width: 100% !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .tracking-header-icon {
            width: 42px !important;
            height: 42px !important;
            border-radius: 13px !important;
          }
          .tracking-header-copy {
            min-width: 0 !important;
            flex: 1 !important;
          }
          .tracking-header-copy h1 {
            font-size: 15px !important;
            line-height: 1.28 !important;
          }
          .header-actions {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            width: 100% !important;
            gap: 8px !important;
          }
          .header-action-btn {
            width: 100% !important;
            min-height: 44px !important;
            justify-content: center !important;
            padding: 9px 10px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
          }
          .lr-label { display: none !important; }
          .driver-experience-card { width: 100% !important; min-width: 0 !important; }
          .remarks-modal-shell {
            width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .remarks-grid {
            grid-template-columns: 1fr !important;
          }
          .invoice-modal-overlay {
            align-items: stretch !important;
            justify-content: stretch !important;
            padding: 0 !important;
          }
          .invoice-modal-shell {
            width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            border-bottom: none !important;
          }
          .invoice-modal-header {
            padding: 16px 16px 14px !important;
            position: sticky !important;
            top: 0 !important;
            background: rgba(255,255,255,0.98) !important;
            z-index: 1 !important;
          }
          .invoice-modal-body {
            padding: 16px !important;
          }
        }
        button, .hover-btn, .hover-dark-btn, .route-open-map-btn, .quick-action, .call-btn { cursor: pointer; }
        .route-open-map-btn { display: none; }
        .map-desktop-only { display: block; }
        .powered-by-optimile-mobile { display: none; }
        @media (max-width: 600px) {
          .route-open-map-btn { display: inline-flex !important; }
          .map-desktop-only { display: none !important; }
          .powered-by-optimile-desktop { display: none !important; }
          .powered-by-optimile-mobile {
            display: flex !important;
            min-height: 72px;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
        }
        .hover-btn:hover { background: #f1f5f9 !important; }
        .hover-dark-btn:hover { background: #1e293b !important; }
        .call-btn:hover { background: #f1f5f9 !important; }
        .quick-action:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(15,23,42,0.08); }
      `}</style>

            <div className="tracking-root" style={{ maxWidth: 1400, height: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
                <div className="tracking-bg-orb" style={{ width: 260, height: 260, top: -40, left: -20, background: "rgba(99,102,241,0.22)" }} />
                <div className="tracking-bg-orb" style={{ width: 280, height: 280, top: 170, right: 260, background: "rgba(16,185,129,0.18)" }} />
                <div className="tracking-bg-orb" style={{ width: 220, height: 220, bottom: -30, right: 40, background: "rgba(59,130,246,0.14)" }} />

                {/* ── HEADER ── */}
                <header className="tracking-panel tracking-panel-soft tracking-header" style={{ position: "relative", overflow: "hidden", borderRadius: 22, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(79,70,229,0.08), transparent 35%, rgba(16,185,129,0.08))", pointerEvents: "none" }} />
                    <div className="tracking-header-main" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div className="tracking-header-icon" style={{ width: 48, height: 48, borderRadius: 15, background: "linear-gradient(145deg, #4f46e5, #312e81)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 28px rgba(79,70,229,0.32)", flexShrink: 0 }}>
                            <Truck size={20} color="#fff" strokeWidth={1.8} />
                        </div>
                        <div className="tracking-header-copy" style={{ position: "relative", zIndex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>#5520 · Consignee Link · Verified</h1>
                                <span className="metal-chip" style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 99, padding: "4px 11px" }}>
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block", animation: "pulse 2s infinite" }} />
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d", letterSpacing: "0.05em" }}>LIVE</span>
                                </span>
                                <span className="lr-label metal-chip" style={{ fontSize: 12, color: "#64748b", borderRadius: 8, padding: "3px 9px", fontFamily: "monospace" }}>LR: {mockData.lrNumber}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                                <ShieldCheck size={13} color="#64748b" strokeWidth={1.8} />
                                <span style={{ fontSize: 12, color: "#64748b" }}>Secure logistics tracking enabled</span>
                            </div>
                        </div>
                    </div>
                    <div className="header-actions" style={{ display: "flex", gap: 8, position: "relative", zIndex: 1 }}>
                        <a href={driverPhoneHref} className="call-btn hover-btn metal-chip header-action-btn" style={{ borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#0f172a", textDecoration: "none" }}>
                            <Phone size={14} strokeWidth={2} /> Call driver
                        </a>
                        <button type="button" onClick={handlePodUploadClick} className="hover-btn metal-chip header-action-btn" style={{ borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#0f172a" }}>
                            <Upload size={14} strokeWidth={2} /> Upload POD
                        </button>
                        <button type="button" onClick={() => setShowInvoiceModal(true)} className="hover-btn metal-chip header-action-btn" style={{ borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#0f172a" }}>
                            <FileText size={14} strokeWidth={2} /> View Invoice
                        </button>
                        <button type="button" onClick={() => setShowDeliveryModal(true)} className="hover-dark-btn header-action-btn" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", color: "#fff", border: "none", borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 12px 24px rgba(15,23,42,0.16)" }}>
                            <MessageSquare size={14} strokeWidth={2} /> Add Remarks
                        </button>
                    </div>
                </header>

                {selectedPodName && (
                    <div className="tracking-panel tracking-panel-soft pod-banner" style={{ borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(145deg, #dcfce7, #bbf7d0)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <CheckCircle2 size={15} color="#15803d" strokeWidth={2.4} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#15803d", letterSpacing: "0.06em", textTransform: "uppercase" }}>POD Updated</p>
                                <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedPodName}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STAT STRIP ── */}
                <div className="stats-row" style={{ display: "flex", gap: 10 }}>
                    <StatCard icon={Clock} label="ETA" value={travelMetrics.eta} />
                    <StatCard icon={Navigation} label="Arriving In" value={travelMetrics.arrivingIn} />
                    {/* <StatCard icon={Gauge} label="Speed" value={mockData.speed} />
                    <StatCard icon={Route} label="Distance Left" value={travelMetrics.distance} /> */}
                    <StatCard icon={PackageCheck} label="Progress" value={`${progress}% Complete`} accent progress={progress} />
                </div>

                {/* ── MAIN 3-COL GRID ── */}
                <div className="tracking-shell track-grid" style={{ display: "grid", gridTemplateColumns: "280px 1.6fr 320px", gap: 12, flex: 1, minHeight: 0 }}>

                    {/* ── COL 1: DRIVER + ROUTE ── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
                        {/* Driver and vehicle actions */}
                        <div className="hero-card driver-card" style={{ background: "radial-gradient(circle at top right, rgba(129,140,248,0.28), transparent 28%), linear-gradient(145deg, #17134a 0%, #312e81 55%, #1d4ed8 100%)", borderRadius: 24, padding: 18, color: "#fff", boxShadow: "0 22px 42px rgba(49,46,129,0.28)", border: "1px solid rgba(255,255,255,0.12)", position: "relative", overflow: "hidden", transition: "all 0.24s ease", minHeight: 156 }}>
                            <div style={{ position: "absolute", right: -30, bottom: -36, width: 130, height: 130, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)" }} />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, position: "relative", zIndex: 1 }}>
                                <div style={{ minWidth: 0, paddingRight: 4 }}>
                                    <p style={{ margin: 0, fontSize: 11, color: "#a5b4fc", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" }}>Driver & Vehicle</p>
                                    <button type="button" onClick={() => openDriverVehicleDetails("driver")} style={{ display: "block", margin: "8px 0 4px", padding: 0, border: "none", background: "transparent", color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", cursor: "pointer", textAlign: "left", lineHeight: 1.2 }}>
                                        {mockData.driverName}
                                    </button>
                                    <button type="button" onClick={() => openDriverVehicleDetails("vehicle")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", borderRadius: 999, padding: "5px 11px", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}>
                                        <Truck size={13} color="#a5b4fc" strokeWidth={1.8} />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#c7d2fe", fontFamily: "monospace" }}>{mockData.vehicleNumber}</span>
                                    </button>
                                    <p style={{ margin: "8px 0 0", fontSize: 12, color: "#c7d2fe" }}>{mockData.driverPhone}</p>
                                </div>
                                <button type="button" onClick={() => openDriverVehicleDetails("driver")} className="view-details-btn" style={{ width: 122, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", padding: "0 12px", fontSize: 12, fontWeight: 750, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all 0.18s", whiteSpace: "nowrap", flexShrink: 0 }}>
                                    <User size={14} color="#c7d2fe" strokeWidth={1.8} />
                                    View Details
                                </button>
                            </div>
                        </div>

                        {/* Route card */}
                        <div className="tracking-panel tracking-panel-soft route-card" style={{ borderRadius: 22, padding: 16, position: "relative" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                                <div style={{ minWidth: 0 }}>
                                    <p className="section-title" style={{ margin: 0 }}>Route</p>
                                    <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: podCompleted ? "#166534" : "#0f172a", background: podCompleted ? "#dcfce7" : "#eef2ff", borderRadius: 999, padding: "5px 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                            {podCompleted ? "completed" : "In Transit"}
                                        </span>
                                        {podCompleted && (
                                            <span style={{ fontSize: 11, color: "#475569" }}>POD uploaded</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="route-open-map-btn"
                                    onClick={handleMapToggleFullscreen}
                                    style={{ alignItems: "center", gap: 8, borderRadius: 14, padding: "10px 14px", border: "1px solid transparent", background: "linear-gradient(135deg,#4f46e5,#312e81)", color: "#fff", boxShadow: "0 14px 36px rgba(49,46,129,0.18)", fontWeight: 700, cursor: "pointer", display: "none" }}
                                >
                                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 10, background: "rgba(255,255,255,0.16)" }}>
                                        <MapPin size={16} color="#fff" />
                                    </span>
                                    Open Map
                                </button>
                            </div>
                            <div className="route-connector-shell" style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 12, position: "relative" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, minWidth: 44 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <MapPin size={15} color="#16a34a" strokeWidth={2} />
                                    </div>
                                    <div style={{ width: 2, flex: 1, minHeight: 48, borderLeft: "2px dashed rgba(148,163,184,0.7)" }} />
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <Navigation size={15} color="#dc2626" strokeWidth={2} />
                                    </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pickup</p>
                                            <p style={{ margin: "3px 0 2px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{mockData.origin}</p>
                                            <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{mockData.originFull}</p>
                                        </div>
                                    </div>
                                    <div style={{ margin: "6px 0 14px 0", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                                        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <Truck size={15} color="#4f46e5" strokeWidth={2} />
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Current location</p>
                                                <p style={{ margin: "3px 0 2px", fontSize: 14, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mockData.currentLocation}</p>
                                            </div>
                                        </div>
                                        <div style={{ marginLeft: 12, flexShrink: 0 }}>
                                            <div style={{ fontSize: 11, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 999, padding: "6px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>
                                                {travelMetrics.distance} remaining
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Destination</p>
                                            <p style={{ margin: "3px 0 2px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Chitrambalam Layout</p>
                                            <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{mockData.destinationFull}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customer info */}
                        <div className="tracking-panel tracking-panel-soft" style={{ borderRadius: 22, padding: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(145deg, #ede9fe, #ddd6fe)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>{mockData.customer.charAt(0)}</span>
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Consignee</p>
                                    <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{mockData.customer}</p>
                                </div>
                                <div style={{ marginLeft: "auto" }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", background: "#ede9fe", borderRadius: 6, padding: "3px 10px" }}>Verified</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── COL 2: MAP + DELIVERY EXPERIENCE ── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
                        <div className="tracking-panel floating-map" style={{ borderRadius: 24, padding: 14, flex: 1, display: "flex", flexDirection: "column", gap: 10, minHeight: 0, position: "relative", overflow: "hidden" }}>
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(79,70,229,0.03), transparent 28%)", pointerEvents: "none" }} />

                            <div className="map-desktop-only" style={{ width: "100%" }}>
                                <MapView
                                    arrivingIn={travelMetrics.arrivingIn}
                                    directions={directions}
                                    isMapLoaded={isMapLoaded}
                                    loadError={loadError}
                                    mapAuthFailed={mapAuthFailed}
                                    mapMode={mapMode}
                                    progress={progress}
                                    isFullscreen={false}
                                    onMapModeChange={handleMapModeChange}
                                    onToggleFullscreen={handleMapToggleFullscreen}
                                />
                            </div>

                            {/* Bottom status bar */}
                            <div style={{ background: "linear-gradient(180deg, rgba(248,250,252,0.98), rgba(241,245,249,0.94))", border: "1px solid #e2e8f0", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 3px rgba(16,185,129,0.2)" }} />
                                    <span style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{podCompleted ? "Shipment has been delivered" : "Shipment is currently in transit"}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b" }}>
                                    <Truck size={13} strokeWidth={1.8} />
                                    <span style={{ fontSize: 12 }}>{mockData.vehicleNumber}</span>
                                </div>
                            </div>
                            <div className="powered-by-optimile-desktop" style={{ flex: 1, minHeight: 72, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                Powered by Optimile
                            </div>
                        </div>
                    </div>

                    {/* ── COL 3: SHIPMENT ACTIVITY TIMELINE ── */}
                    <div className="tracking-panel tracking-panel-soft timeline-panel" style={{ minHeight: 0, borderRadius: 24, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Shipment Activity</h3>
                                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{activityTimeline.filter(t => t.done).length} of {activityTimeline.length} steps completed</p>
                            </div>
                            <span style={{ background: podCompleted ? "linear-gradient(180deg, #dcfce7, #bbf7d0)" : "linear-gradient(180deg, #ede9fe, #ddd6fe)", color: podCompleted ? "#15803d" : "#6d28d9", borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>{podCompleted ? "Completed" : "In Transit"}</span>
                        </div>

                        <div style={{ padding: "10px 18px 0" }}>
                            <div style={{ height: 4, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #059669, #4f46e5)", width: `${(activityTimeline.filter(t => t.done).length / activityTimeline.length) * 100}%` }} />
                            </div>
                        </div>

                        <div className="timeline-body" style={{ flex: 1, padding: "14px 18px 16px" }}>
                            <div className="timeline-list" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                                {activityTimeline.map((item, i) => (
                                    <div key={i} className="timeline-entry" style={{ display: "flex", gap: 14, animationDelay: `${0.12 + i * 0.08}s` }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                            <Dot done={item.done} active={item.active} pending={item.pending} />
                                            {i < activityTimeline.length - 1 && (
                                                <div style={{ width: 2, flex: 1, minHeight: 20, marginTop: 4, marginBottom: 4, background: item.done ? "#bbf7d0" : "#e2e8f0", borderRadius: 99 }} />
                                            )}
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: i < timeline.length - 1 ? 12 : 0, paddingTop: 2 }}>
                                            <div style={{ background: item.active ? "#f5f3ff" : item.pending ? "#fafafa" : "#f8fffe", border: `1px solid ${item.active ? "#ddd6fe" : item.pending ? "#f1f5f9" : "#d1fae5"}`, borderRadius: 14, padding: "9px 12px", boxShadow: item.active ? "0 14px 28px rgba(79,70,229,0.10)" : "none" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: item.pending ? "#94a3b8" : "#0f172a" }}>{item.label}</p>
                                                    {item.active && <span style={{ fontSize: 10, fontWeight: 700, color: "#4f46e5", background: "#e0e7ff", borderRadius: 6, padding: "2px 8px" }}>NOW</span>}
                                                    {item.done && <CheckCircle2 size={14} color="#059669" strokeWidth={2.5} />}
                                                </div>
                                                <p style={{ margin: "4px 0 0", fontSize: 11, color: item.pending ? "#cbd5e1" : "#64748b", fontWeight: 500 }}>{item.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Quick actions sticky footer */}
                                {/* <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.96)", borderTop: "1px solid #e2e8f0", padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 9, zIndex: 999, backdropFilter: "blur(12px)" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>Quick actions</p>
                                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Driver support and delivery updates</p>
                                        </div>
                                        <span style={{ borderRadius: 999, background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "4px 9px", whiteSpace: "nowrap" }}>Live</span>
                                    </div>
                                    <a href={driverPhoneHref} className="quick-action" style={{ ...bottomActionStyle, minHeight: 52, background: "linear-gradient(135deg,#4f46e5,#312e81)", border: "none", color: "#fff", fontSize: 14, boxShadow: "0 12px 24px rgba(79,70,229,0.18)", transition: "0.18s ease" }}>
                                        <Phone size={17} /> Call Driver
                                    </a>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                                        <button type="button" className="quick-action" style={{ ...bottomActionStyle, flexDirection: "column", transition: "0.18s ease" }}>
                                            <MapPin size={17} /><span>Gate</span>
                                        </button>
                                        <button type="button" className="quick-action" onClick={handlePodUploadClick} style={{ ...bottomActionStyle, flexDirection: "column", transition: "0.18s ease" }}>
                                            <Upload size={17} /><span>POD</span>
                                        </button>
                                        <button type="button" className="quick-action" style={{ ...bottomActionStyle, flexDirection: "column", transition: "0.18s ease" }}>
                                            <MessageSquare size={17} /><span>Issue</span>
                                        </button>
                                    </div>
                                </div> */}
                            </div>
                        </div>
                    </div>
                    <div className="powered-by-optimile-mobile">
                        Powered by Optimile
                    </div>
                </div>
            </div>
        </div>
    )
}
