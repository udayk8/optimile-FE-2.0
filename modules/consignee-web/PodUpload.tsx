import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent, type RefObject } from "react"
import { ArrowLeft, Check, CheckCircle2, Star, Upload, X } from "lucide-react"


type PodStep = "choice" | "requestOtp" | "verifyOtp" | "otpSuccess" | "esign" | "reviewSuccess"
type SignatureMode = "draw" | "type" | "upload"
type CompletionMethod = "pod" | "esign"


interface PodUploadModalProps {
    isOpen: boolean
    onClose: () => void
    consigneeName: string
    contactPhone: string
    contactEmail?: string
    onComplete: (label: string) => void
}


const primary = "#4f46e5"
const primaryDark = "#312e81"
const softBorder = "#e2e8f0"
const ratingOptions = [
    { value: 1, label: "Poor", tone: "#ef4444", background: "#fef2f2" },
    { value: 2, label: "Fair", tone: "#f97316", background: "#fff7ed" },
    { value: 3, label: "Good", tone: "#ca8a04", background: "#fefce8" },
    { value: 4, label: "Very good", tone: "#16a34a", background: "#f0fdf4" },
    { value: 5, label: "Excellent", tone: "#7c3aed", background: "#f5f3ff" },
] as const


const getRatingMeta = (value: number) => ratingOptions.find((item) => item.value === value)


export function PodUploadModal({ isOpen, onClose, consigneeName, contactPhone, contactEmail, onComplete }: PodUploadModalProps) {
    const [step, setStep] = useState<PodStep>("choice")
    const [podFileName, setPodFileName] = useState("")
    const [consent, setConsent] = useState(false)
    const [otp, setOtp] = useState("")
    const [signatureMode, setSignatureMode] = useState<SignatureMode>("draw")
    const [typedSignature, setTypedSignature] = useState("")
    const [signatureFileName, setSignatureFileName] = useState("")
    const [hasDrawn, setHasDrawn] = useState(false)
    const [driverRating, setDriverRating] = useState(0)
    const [driverRatingPreview, setDriverRatingPreview] = useState(0)
    const [completionLabel, setCompletionLabel] = useState("")
    const [completionMethod, setCompletionMethod] = useState<CompletionMethod>("pod")
    const [isMobile, setIsMobile] = useState(false)
    const podInputRef = useRef<HTMLInputElement | null>(null)
    const cameraInputRef = useRef<HTMLInputElement | null>(null)
    const signatureInputRef = useRef<HTMLInputElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const drawingRef = useRef(false)


    useEffect(() => {
        if (!isOpen) return
        setStep("choice")
        setPodFileName("")
        setConsent(false)
        setOtp("")
        setSignatureMode("draw")
        setTypedSignature(consigneeName)
        setSignatureFileName("")
        setHasDrawn(false)
        setDriverRating(0)
        setDriverRatingPreview(0)
        setCompletionLabel("")
        setCompletionMethod("pod")
    }, [consigneeName, isOpen])


    useEffect(() => {
        if (!isOpen || step !== "esign" || signatureMode !== "draw") return
        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext("2d")
        if (!context) return
        const rect = canvas.getBoundingClientRect()
        const ratio = window.devicePixelRatio || 1
        canvas.width = rect.width * ratio
        canvas.height = rect.height * ratio
        context.scale(ratio, ratio)
        context.lineWidth = 3
        context.lineCap = "round"
        context.lineJoin = "round"
        context.strokeStyle = "#111827"
    }, [isOpen, signatureMode, step])

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


    const close = () => {
        onClose()
    }


    const submitPodFile = () => {
        if (!podFileName || !consent) return
        setCompletionLabel(podFileName)
        setCompletionMethod("pod")
        setStep("reviewSuccess")
    }


    const submitSignature = () => {
        const hasSignature = signatureMode === "draw" ? hasDrawn : signatureMode === "type" ? typedSignature.trim().length > 0 : signatureFileName.length > 0
        if (!hasSignature || !consent) return
        setCompletionLabel(signatureMode === "upload" ? signatureFileName : "E-signature captured")
        setCompletionMethod("esign")
        setStep("reviewSuccess")
    }


    const submitReview = () => {
        if (!driverRating || !completionLabel) return
        onComplete(completionLabel)
        close()
    }


    const startDraw = (event: PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        const context = canvas?.getContext("2d")
        if (!canvas || !context) return
        const point = getCanvasPoint(canvas, event)
        drawingRef.current = true
        context.beginPath()
        context.moveTo(point.x, point.y)
        canvas.setPointerCapture(event.pointerId)
    }


    const moveDraw = (event: PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return
        const canvas = canvasRef.current
        const context = canvas?.getContext("2d")
        if (!canvas || !context) return
        const point = getCanvasPoint(canvas, event)
        context.lineTo(point.x, point.y)
        context.stroke()
        setHasDrawn(true)
    }


    const endDraw = (event: PointerEvent<HTMLCanvasElement>) => {
        drawingRef.current = false
        canvasRef.current?.releasePointerCapture(event.pointerId)
    }


    const clearDraw = () => {
        const canvas = canvasRef.current
        const context = canvas?.getContext("2d")
        if (!canvas || !context) return
        context.clearRect(0, 0, canvas.width, canvas.height)
        setHasDrawn(false)
    }


    const onPodFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        setPodFileName(event.target.files?.[0]?.name ?? "")
    }


    const onSignatureFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        setSignatureFileName(event.target.files?.[0]?.name ?? "")
    }


    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: isMobile ? "stretch" : "center", background: isMobile ? "#fff" : "rgba(15,23,42,0.48)", backdropFilter: isMobile ? "none" : "blur(8px)", padding: isMobile ? 0 : 16 }}>
            <div style={{ width: isMobile ? "100vw" : step === "choice" ? "min(560px, 96vw)" : step === "esign" ? "min(760px, 96vw)" : step === "reviewSuccess" ? "min(620px, 96vw)" : "min(680px, 96vw)", height: isMobile ? "100dvh" : step === "esign" ? "min(680px, 90vh)" : undefined, maxHeight: isMobile ? "100dvh" : "90vh", overflow: "auto", background: "#fff", border: isMobile ? "none" : "1px solid rgba(226,232,240,0.95)", borderRadius: isMobile ? 0 : 22, boxShadow: isMobile ? "none" : "0 30px 80px rgba(15,23,42,0.28)", display: "flex", flexDirection: "column" }}>
                {step === "choice" ? (
                    <ChoiceScreen
                        podFileName={podFileName}
                        consent={consent}
                        onConsentChange={setConsent}
                        onClose={close}
                        onPickFile={() => podInputRef.current?.click()}
                        onPickCamera={() => cameraInputRef.current?.click()}
                        onESign={() => setStep("requestOtp")}
                        onSubmit={submitPodFile}
                        isMobile={isMobile}
                    />
                ) : null}


                {step === "requestOtp" ? (
                    <OtpRequestScreen
                        phone={contactPhone}
                        email={contactEmail}
                        onClose={close}
                        onGetOtp={() => setStep("verifyOtp")}
                        isMobile={isMobile}
                    />
                ) : null}


                {step === "verifyOtp" ? (
                    <OtpVerifyScreen
                        otp={otp}
                        onOtpChange={setOtp}
                        onClose={close}
                        onResend={() => setOtp("")}
                        onVerify={() => setStep("otpSuccess")}
                        isMobile={isMobile}
                    />
                ) : null}


                {step === "otpSuccess" ? (
                    <OtpSuccessScreen onContinue={() => setStep("esign")} isMobile={isMobile} />
                ) : null}


                {step === "esign" ? (
                    <ESignScreen
                        mode={signatureMode}
                        setMode={setSignatureMode}
                        typedSignature={typedSignature}
                        setTypedSignature={setTypedSignature}
                        signatureFileName={signatureFileName}
                        consent={consent}
                        onConsentChange={setConsent}
                        onBack={() => setStep("choice")}
                        onPickSignature={() => signatureInputRef.current?.click()}
                        onSubmit={submitSignature}
                        canvasRef={canvasRef}
                        onDrawStart={startDraw}
                        onDrawMove={moveDraw}
                        onDrawEnd={endDraw}
                        onClearDraw={clearDraw}
                        hasDrawn={hasDrawn}
                        isMobile={isMobile}
                    />
                ) : null}


                {step === "reviewSuccess" ? (
                    <ReviewSuccessScreen
                        method={completionMethod}
                        label={completionLabel}
                        driverRating={driverRating}
                        driverRatingPreview={driverRatingPreview}
                        onDriverRatingChange={(value) => {
                            setDriverRating(value)
                            setDriverRatingPreview(value)
                        }}
                        onDriverRatingPreviewChange={setDriverRatingPreview}
                        onSubmit={submitReview}
                        onClose={close}
                        isMobile={isMobile}
                    />
                ) : null}


                <input ref={podInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" onChange={onPodFileChange} style={{ display: "none" }} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onPodFileChange} style={{ display: "none" }} />
                <input ref={signatureInputRef} type="file" accept=".jpg,.jpeg,.png" onChange={onSignatureFileChange} style={{ display: "none" }} />
            </div>
        </div>
    )
}


function ChoiceScreen({ podFileName, consent, onConsentChange, onClose, onPickFile, onPickCamera, onESign, onSubmit, isMobile }: {
    podFileName: string
    consent: boolean
    onConsentChange: (value: boolean) => void
    onClose: () => void
    onPickFile: () => void
    onPickCamera: () => void
    onESign: () => void
    onSubmit: () => void
    isMobile: boolean
}) {
    const bodyStyles: CSSProperties = isMobile
        ? {
            padding: "18px 18px 16px",
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            minHeight: 0,
            gap: 16,
          }
        : {
            padding: "24px 24px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: 18,
          }

    return (
        <>
            <ModalHeader title="Upload POD" onClose={onClose} isMobile={isMobile} />
            <div style={{ ...bodyStyles, overflow: isMobile ? "hidden" : "visible" }}>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 18,
                        width: "100%",
                        maxWidth: isMobile ? 520 : 560,
                        margin: isMobile ? "0 auto" : undefined,
                        flex: isMobile ? "1 1 auto" : "0 0 auto",
                        minHeight: 0,
                        overflowY: isMobile ? "auto" : "visible",
                        paddingRight: isMobile ? 2 : 0,
                    }}
                >
                    <button type="button" onClick={onPickFile} style={{ height: 56, border: `1px solid ${softBorder}`, borderRadius: 14, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", cursor: "pointer", color: podFileName ? "#0f172a" : "#94a3b8", fontSize: 15, fontWeight: 650, boxShadow: "0 8px 20px rgba(15,23,42,0.04)" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{podFileName || "Upload"}</span>
                        <Upload size={18} color="#64748b" />
                    </button>
                    <button type="button" onClick={onPickCamera} style={{ height: 56, border: `1px solid ${softBorder}`, borderRadius: 14, background: "linear-gradient(180deg,#f8fafc,#eef2ff)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", cursor: "pointer", color: "#312e81", fontSize: 15, fontWeight: 700, boxShadow: "0 8px 20px rgba(15,23,42,0.04)" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Take photo</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#4f46e5" }}>Camera</span>
                    </button>
                    <Divider />
                    <button type="button" onClick={onESign} style={{ height: 56, border: `1px solid ${softBorder}`, borderRadius: 14, background: "linear-gradient(180deg,#f8fafc,#eef2ff)", fontSize: 15, fontWeight: 800, color: "#312e81", cursor: "pointer" }}>
                        E-signature
                    </button>
                </div>
                <div style={isMobile ? { flexShrink: 0, paddingTop: 2, display: "flex", flexDirection: "column", gap: 16 } : { display: "flex", flexDirection: "column", gap: 16 }}>
                    <Consent checked={consent} onChange={onConsentChange} />
                    <PrimaryButton disabled={!podFileName || !consent} onClick={onSubmit}>Submit</PrimaryButton>
                </div>
            </div>
        </>
    )
}


function ReviewSuccessScreen({ method, label, driverRating, driverRatingPreview, onDriverRatingChange, onDriverRatingPreviewChange, onSubmit, onClose, isMobile }: {
    method: CompletionMethod
    label: string
    driverRating: number
    driverRatingPreview: number
    onDriverRatingChange: (value: number) => void
    onDriverRatingPreviewChange: (value: number) => void
    onSubmit: () => void
    onClose: () => void
    isMobile: boolean
}) {
    const displayRating = driverRatingPreview || driverRating
    const ratingMeta = getRatingMeta(displayRating)
    const title = method === "esign" ? "E-signature uploaded" : "POD uploaded"
    const description = method === "esign" ? "Your e-signature has been captured successfully." : "Your proof of delivery has been uploaded successfully."

    return (
        <div style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}>
            <ModalHeader title="Driver review" onClose={onClose} isMobile={isMobile} />
            <div style={{ padding: isMobile ? "22px 18px 18px" : 26, display: "flex", flexDirection: "column", gap: 20, flex: "1 1 auto", minHeight: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, padding: isMobile ? "18px 10px 8px" : "18px 28px 8px" }}>
                    <div style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(145deg,#dcfce7,#bbf7d0)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 35px rgba(5,150,105,0.16)" }}>
                        <CheckCircle2 size={36} strokeWidth={2.3} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: isMobile ? 24 : 26, fontWeight: 900, color: "#0f172a" }}>{title}</h2>
                        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.45 }}>{description}</p>
                    </div>
                    <div style={{ maxWidth: 430, width: "100%", border: `1px solid ${softBorder}`, borderRadius: 14, background: "#f8fafc", padding: "11px 14px", color: "#334155", fontSize: 13, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {label}
                    </div>
                </div>

                <div style={{ border: `1px solid ${softBorder}`, borderRadius: 18, background: "#fff", boxShadow: "0 16px 35px rgba(15,23,42,0.06)", padding: isMobile ? 18 : 22, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                        <div>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>Review driver</p>
                            <p style={{ margin: "5px 0 0", fontSize: 13, color: "#64748b" }}>How was your delivery experience?</p>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 850, color: ratingMeta?.tone || "#64748b", background: ratingMeta?.background || "#f8fafc", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap" }}>
                            {ratingMeta?.label || "Select rating"}
                        </span>
                    </div>
                    <div
                        style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "center" : "flex-start", gap: 10, flexWrap: "wrap" }}
                        onMouseLeave={() => onDriverRatingPreviewChange(0)}
                        onBlurCapture={() => onDriverRatingPreviewChange(0)}
                    >
                        {[1, 2, 3, 4, 5].map((star) => {
                            const filled = star <= displayRating
                            return (
                                <button
                                    key={star}
                                    type="button"
                                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                                    onMouseEnter={() => onDriverRatingPreviewChange(star)}
                                    onFocus={() => onDriverRatingPreviewChange(star)}
                                    onClick={() => onDriverRatingChange(star)}
                                    style={{
                                        width: isMobile ? 52 : 50,
                                        height: isMobile ? 52 : 50,
                                        borderRadius: 14,
                                        border: `1px solid ${filled ? "#c7d2fe" : "#e2e8f0"}`,
                                        background: filled ? "linear-gradient(180deg, #eef2ff, #e0e7ff)" : "#fff",
                                        color: filled ? "#4f46e5" : "#cbd5e1",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        boxShadow: filled ? "0 10px 20px rgba(79,70,229,0.12)" : "none",
                                        transition: "transform 160ms ease, box-shadow 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease",
                                    }}
                                >
                                    <Star size={22} fill={filled ? "currentColor" : "none"} strokeWidth={2.1} />
                                </button>
                            )
                        })}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", textAlign: isMobile ? "center" : "left" }}>
                        {displayRating ? `${displayRating}/5 selected` : "Tap a star to continue."}
                    </p>
                </div>
            </div>
            <div style={{ marginTop: "auto", padding: isMobile ? "0 18px 18px" : "0 26px 26px" }}>
                <PrimaryButton disabled={!driverRating} onClick={onSubmit}>Submit review</PrimaryButton>
            </div>
        </div>
    )
}


function OtpRequestScreen({ phone, email, onClose, onGetOtp, isMobile }: { phone: string; email?: string; onClose: () => void; onGetOtp: () => void; isMobile: boolean }) {
    return (
        <div style={isMobile ? { padding: 18, display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 } : { padding: 24 }}>
            <ModalHeader title="Upload POD" onClose={onClose} isMobile={isMobile} />
            <div style={isMobile ? { flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column" } : {}}>
                <div style={{ marginTop: 28 }}>
                    <Stepper step={1} />
                </div>
                <p style={{ margin: "36px 0 22px", textAlign: "center", fontSize: 16, color: "#334155", lineHeight: 1.5 }}>You'll receive a one-time password on this mobile number or email.</p>
                <div style={{ background: "#f8fafc", border: `1px solid ${softBorder}`, borderRadius: 14, padding: 18, fontSize: 15, lineHeight: 1.6, color: "#0f172a" }}>
                    <div>Mobile no:</div>
                    <div>{phone}</div>
                    <div style={{ marginTop: 12 }}>Email:</div>
                    <div>{email || "raju@gmail.com"}</div>
                </div>
            </div>
            <div style={isMobile ? { marginTop: "auto", paddingTop: 18, display: "flex", justifyContent: "center", gap: 12 } : { display: "flex", justifyContent: "center", gap: 12, marginTop: 22 }}>
                <SecondaryButton onClick={onClose}>CLOSE</SecondaryButton>
                <PrimarySmallButton onClick={onGetOtp}>GET OTP</PrimarySmallButton>
            </div>
        </div>
    )
}


function OtpVerifyScreen({ otp, onOtpChange, onClose, onResend, onVerify, isMobile }: {
    otp: string
    onOtpChange: (value: string) => void
    onClose: () => void
    onResend: () => void
    onVerify: () => void
    isMobile: boolean
}) {
    return (
        <div style={isMobile ? { padding: 18, display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 } : { padding: 24 }}>
            <ModalHeader title="Upload POD" onClose={onClose} isMobile={isMobile} />
            <div style={isMobile ? { flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column" } : {}}>
                <div style={{ marginTop: isMobile ? 28 : 40 }}>
                    <Stepper step={2} />
                </div>
                <p style={{ margin: isMobile ? "36px 0 22px" : "42px 0 28px", textAlign: "center", fontSize: 16, color: "#334155" }}>Enter the 6-digit OTP sent to your mobile & email</p>
                <input
                    value={otp}
                    onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="ENTER OTP"
                    inputMode="numeric"
                    style={{ width: "100%", height: 58, border: `1px solid ${softBorder}`, borderRadius: 14, textAlign: "center", fontSize: 22, letterSpacing: 2, outline: "none", color: "#0f172a", background: "#fff" }}
                />
            </div>
            <div style={isMobile ? { marginTop: "auto", paddingTop: 18, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" } : { display: "flex", justifyContent: "center", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
                <button type="button" onClick={onResend} style={{ height: 42, minWidth: 132, border: `1px solid ${softBorder}`, borderRadius: 12, padding: "0 18px", background: "#f8fafc", fontSize: 13, fontWeight: 750, color: "#334155", cursor: "pointer" }}>RESEND OTP</button>
                <PrimarySmallButton disabled={otp.length !== 6} onClick={onVerify}>VERIFY</PrimarySmallButton>
            </div>
        </div>
    )
}


function OtpSuccessScreen({ onContinue, isMobile }: { onContinue: () => void; isMobile: boolean }) {
    return (
        <div style={{ padding: 28, textAlign: "center", display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}>
            <ModalHeader title="Upload POD" onClose={onContinue} isMobile={isMobile} />
            <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: isMobile ? 0 : 28 }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#dcfce7", color: "#059669", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={28} />
                    </div>
                    <h2 style={{ margin: "18px 0 8px", fontSize: 22, color: "#0f172a" }}>OTP Verified</h2>
                    <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>Continue to capture the e-signature.</p>
                    {!isMobile ? <PrimarySmallButton onClick={onContinue}>CONTINUE</PrimarySmallButton> : null}
                </div>
            </div>
            {isMobile ? (
                <div style={{ marginTop: "auto", paddingTop: 18, display: "flex", justifyContent: "center" }}>
                    <PrimarySmallButton onClick={onContinue}>CONTINUE</PrimarySmallButton>
                </div>
            ) : null}
        </div>
    )
}


function ESignScreen(props: {
    mode: SignatureMode
    setMode: (mode: SignatureMode) => void
    typedSignature: string
    setTypedSignature: (value: string) => void
    signatureFileName: string
    consent: boolean
    onConsentChange: (value: boolean) => void
    onBack: () => void
    onPickSignature: () => void
    onSubmit: () => void
    canvasRef: RefObject<HTMLCanvasElement | null>
    onDrawStart: (event: PointerEvent<HTMLCanvasElement>) => void
    onDrawMove: (event: PointerEvent<HTMLCanvasElement>) => void
    onDrawEnd: (event: PointerEvent<HTMLCanvasElement>) => void
    onClearDraw: () => void
    hasDrawn: boolean
    isMobile: boolean
}) {
    const submitDisabled = !props.consent || (props.mode === "draw" ? !props.hasDrawn : props.mode === "type" ? !props.typedSignature.trim() : !props.signatureFileName)
    return (
        <div style={props.isMobile ? { display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 } : undefined}>
            <ModalHeader title="E-signature" onClose={props.onBack} isMobile={props.isMobile} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", height: 54, borderBottom: `1px solid ${softBorder}` }}>
                {(["draw", "type", "upload"] as SignatureMode[]).map((mode) => (
                    <button key={mode} type="button" onClick={() => props.setMode(mode)} style={{ border: "none", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: props.mode === mode ? 850 : 750, color: props.mode === mode ? primary : "#64748b", borderBottom: props.mode === mode ? `3px solid ${primary}` : "3px solid transparent" }}>
                        {mode[0].toUpperCase() + mode.slice(1)}
                    </button>
                ))}
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, flex: "1 1 auto", minHeight: 0 }}>
                <div style={{ height: 316, display: "flex", flexDirection: "column", gap: 12 }}>
                    {props.mode === "draw" ? <DrawSignature canvasRef={props.canvasRef} onDrawStart={props.onDrawStart} onDrawMove={props.onDrawMove} onDrawEnd={props.onDrawEnd} onClear={props.onClearDraw} /> : null}
                    {props.mode === "type" ? <TypeSignature value={props.typedSignature} onChange={props.setTypedSignature} /> : null}
                    {props.mode === "upload" ? <UploadSignature fileName={props.signatureFileName} onPick={props.onPickSignature} /> : null}
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
                    {props.mode === "type" ? "By typing your name, you agree this serves as your legal electronic signature." : "By signing, I confirm that my electronic signature has the same legal validity."}
                </p>
                {!props.isMobile ? <Consent checked={props.consent} onChange={props.onConsentChange} /> : null}
            </div>
            <div style={props.isMobile ? { marginTop: "auto", padding: "0 22px 18px", display: "flex", flexDirection: "column", gap: 16 } : { padding: "0 22px 22px" }}>
                {props.isMobile ? <Consent checked={props.consent} onChange={props.onConsentChange} /> : null}
                <PrimaryButton disabled={submitDisabled} onClick={props.onSubmit}>Submit</PrimaryButton>
            </div>
        </div>
    )
}


function DrawSignature({ canvasRef, onDrawStart, onDrawMove, onDrawEnd, onClear }: {
    canvasRef: RefObject<HTMLCanvasElement | null>
    onDrawStart: (event: PointerEvent<HTMLCanvasElement>) => void
    onDrawMove: (event: PointerEvent<HTMLCanvasElement>) => void
    onDrawEnd: (event: PointerEvent<HTMLCanvasElement>) => void
    onClear: () => void
}) {
    return (
        <div style={{ border: `1px solid ${softBorder}`, borderRadius: 16, height: "100%", position: "relative", overflow: "hidden", background: "#fff" }}>
            <button type="button" onClick={onClear} style={{ position: "absolute", right: 16, top: 12, zIndex: 1, border: "none", background: "#f8fafc", borderRadius: 10, padding: "6px 10px", fontWeight: 800, fontSize: 12, cursor: "pointer", color: "#0f172a" }}>Clear</button>
            <canvas ref={canvasRef} onPointerDown={onDrawStart} onPointerMove={onDrawMove} onPointerUp={onDrawEnd} onPointerCancel={onDrawEnd} style={{ width: "100%", height: "100%", touchAction: "none", display: "block" }} />
        </div>
    )
}


function TypeSignature({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <>
            <fieldset style={{ border: `1px solid ${softBorder}`, borderRadius: 14, padding: "10px 14px 12px", background: "#fff" }}>
                <legend style={{ padding: "0 8px", fontSize: 12, fontWeight: 750, color: "#64748b" }}>Type your full name</legend>
                <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="e.g. John Doe" style={{ width: "100%", border: "none", outline: "none", fontSize: 16, color: "#0f172a" }} />
            </fieldset>
            <div style={{ flex: 1, minHeight: 0, border: "2px dashed #cbd5e1", borderRadius: 16, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: value.trim() ? "#0f172a" : "#94a3b8", fontSize: value.trim() ? 52 : 16, fontWeight: value.trim() ? 850 : 500, overflowWrap: "anywhere", textAlign: "center", padding: 20 }}>
                {value.trim() || "Your signature will appear here"}
            </div>
        </>
    )
}


function UploadSignature({ fileName, onPick }: { fileName: string; onPick: () => void }) {
    return (
        <div style={{ border: `1px solid ${softBorder}`, borderRadius: 16, height: "100%", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18, textAlign: "center", padding: 18 }}>
            <div>
                <h3 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>Upload signature</h3>
                <p style={{ margin: "10px 0 0", fontSize: 14, color: "#64748b" }}>Supported formats: <strong>.jpg, .jpeg</strong> (Max 20MB)</p>
                {fileName ? <p style={{ margin: "12px 0 0", fontSize: 16, color: "#666" }}>{fileName}</p> : null}
            </div>
            <button type="button" onClick={onPick} style={{ height: 46, border: "none", borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#312e81)", color: "#fff", padding: "0 24px", fontSize: 14, fontWeight: 750, cursor: "pointer", boxShadow: "0 10px 18px rgba(79,70,229,0.18)" }}>Select Image</button>
        </div>
    )
}


function Stepper({ step }: { step: 1 | 2 }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10 }}>
            <StepDot state={step === 1 ? "active" : "done"} label="Request OTP" />
            <div style={{ height: 1, background: softBorder }} />
            <StepDot state={step === 2 ? "active" : "pending"} label="Verify OTP" />
        </div>
    )
}


function StepDot({ state, label }: { state: "active" | "done" | "pending"; label: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: state === "pending" ? "#cbd5e1" : state === "done" ? "#059669" : primary, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>
                {state === "done" ? <Check size={18} /> : label === "Request OTP" ? "1" : "2"}
            </span>
            <span style={{ fontSize: 14, fontWeight: state === "pending" ? 650 : 800, color: state === "pending" ? "#64748b" : "#0f172a" }}>{label}</span>
        </div>
    )
}


function ModalHeader({ title, onClose, isMobile }: { title: string; onClose: () => void; isMobile?: boolean }) {
    return (
        <div style={{ height: 72, padding: "0 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${softBorder}` }}>
            <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Proof of delivery</p>
                <h2 style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 850, color: "#0f172a" }}>{title}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 8, display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                {isMobile ? <><ArrowLeft size={18} color="#64748b" /> Close</> : <X size={22} color="#64748b" />}
            </button>
        </div>
    )
}


function Divider() {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, color: "#64748b", fontSize: 13, fontWeight: 750 }}>
            <span style={{ height: 1, background: "#f1f5f9" }} />
            or
            <span style={{ height: 1, background: "#f1f5f9" }} />
        </div>
    )
}


function Consent({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
    return (
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, lineHeight: 1.45, color: "#0f172a", cursor: "pointer" }}>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} style={{ width: 18, height: 18, marginTop: 1, accentColor: primary, flexShrink: 0 }} />
            <span>Hereby, I confirm that the original Proof of Delivery has been received.</span>
        </label>
    )
}


function PrimaryButton({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick: () => void }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} style={{ width: "100%", height: 52, borderRadius: 14, border: "none", background: disabled ? "#a5b4fc" : "linear-gradient(135deg,#4f46e5,#312e81)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 12px 24px rgba(79,70,229,0.18)" }}>
            {children}
        </button>
    )
}


function PrimarySmallButton({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick: () => void }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} style={{ minWidth: 132, height: 44, borderRadius: 12, border: "none", background: disabled ? "#a5b4fc" : "linear-gradient(135deg,#4f46e5,#312e81)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer" }}>
            {children}
        </button>
    )
}


function SecondaryButton({ children, onClick }: { children: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} style={{ minWidth: 132, height: 44, borderRadius: 12, border: `1px solid ${softBorder}`, background: "#f8fafc", color: "#0f172a", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            {children}
        </button>
    )
}


function getCanvasPoint(canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>) {
    const rect = canvas.getBoundingClientRect()
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    }
}
