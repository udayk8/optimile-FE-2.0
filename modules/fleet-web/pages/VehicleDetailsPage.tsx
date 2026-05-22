
import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleDocument, TelemetryEvent, DocumentStatus, DerivedVehicleStatus, VehicleComponent, ComponentType, ComponentStatus, DocumentType, VehicleMaintenanceItem, ComponentHistoryRecord, TyreHealthSignal, TyreEventSignal, TyreSignalType, EnergyMetrics, EnergyAnomaly, EmissionStandard, Battery, BatteryStatus, VehicleTrackingDevice, TrackerProtocol, TrackerPowerSource, TrackerStatus, TrackerDeviceKind } from '../types';
import { VehicleAPI, ComplianceAPI, TelematicsAPI, ComponentAPI, MaintenanceAPI, TyreAPI, EnergyAPI, TrackingDeviceAPI } from '../services/mockDatabase';
import { BatteryAPI } from '../services/mockDatabase2';
import { IconTruck, IconFile, IconMap, IconAlert, IconCheck, IconArrowRight, IconCpu, IconPlus, IconUpload, IconEye, IconEdit, IconDownload, IconWrench, IconHistory, IconTyre, IconFuel, IconDroplet, IconZap, IconBattery } from '../components/Icons';
import { Badge, Button, Modal, Input, Select } from '../components/UI';

interface Props {
    vehicleId: string;
    onBack: () => void;
}

export const VehicleDetailsPage: React.FC<Props> = ({ vehicleId, onBack }) => {
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [documents, setDocuments] = useState<VehicleDocument[]>([]);
    const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
    const [components, setComponents] = useState<VehicleComponent[]>([]);
    const [maintenanceSchedule, setMaintenanceSchedule] = useState<VehicleMaintenanceItem[]>([]);
    const [componentHistory, setComponentHistory] = useState<ComponentHistoryRecord[]>([]);
    const [tyreHealth, setTyreHealth] = useState<TyreHealthSignal[]>([]);
    const [tyreEvents, setTyreEvents] = useState<TyreEventSignal[]>([]);
    const [energyMetrics, setEnergyMetrics] = useState<EnergyMetrics | null>(null);
    const [energyAnomalies, setEnergyAnomalies] = useState<EnergyAnomaly[]>([]);
    const [batteries, setBatteries] = useState<Battery[]>([]);
    const [availableBatteries, setAvailableBatteries] = useState<Battery[]>([]);
    
    const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'batteries' | 'maintenance' | 'compliance' | 'telemetry'>('overview');
    const [isLoading, setIsLoading] = useState(true);

    // Component Modal
    const [isCompModalOpen, setIsCompModalOpen] = useState(false);
    const [isSubmittingComp, setIsSubmittingComp] = useState(false);
    const [newComponent, setNewComponent] = useState({
        component_type: ComponentType.ENGINE,
        serial_number: '',
        make: '',
        model: '',
        installation_date: new Date().toISOString().split('T')[0],
        status: ComponentStatus.ACTIVE
    });

    // Document Modal
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
    const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<VehicleDocument | null>(null);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [selectedHistoryEntryId, setSelectedHistoryEntryId] = useState<string | null>(null);
    const [newDocument, setNewDocument] = useState({
        document_type: DocumentType.RC,
        document_number: '',
        issue_date: '',
        expiry_date: '',
        file_name: '',
        uploaded_by: 'Current User'
    });

    // Battery Install Modal
    const [isBattModalOpen, setIsBattModalOpen] = useState(false);
    const [newBattInstall, setNewBattInstall] = useState({ battery_id: '', odometer: '' });
    const docFileInputRef = React.useRef<HTMLInputElement>(null);

    // Tracking Device
    const [trackers, setTrackers] = useState<VehicleTrackingDevice[]>([]);
    const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
    const [expandedTrackerId, setExpandedTrackerId] = useState<string | null>(null);
    const [isSubmittingTracker, setIsSubmittingTracker] = useState(false);
    const [editingTrackerId, setEditingTrackerId] = useState<string | null>(null);
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
    const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
    const [trackerForm, setTrackerForm] = useState({
        device_kind: TrackerDeviceKind.GPS_TRACKING,
        is_primary: true,
        manufacturer: '',
        model: '',
        serial_number: '',
        imei: '',
        sim_iccid: '',
        mobile_number: '',
        protocol: TrackerProtocol.TELTONIKA,
        install_date: new Date().toISOString().split('T')[0],
        installer_vendor: '',
        mounting_location: 'Under Dashboard',
        power_source: TrackerPowerSource.DIRECT,
        ignition_wired: true,
        odometer_at_install: '',
        server_host: 'track.optimile.in',
        server_port: '5027',
        apn: 'airtelgprs.com',
        reporting_interval_sec: '30',
        idle_interval_sec: '300',
        heartbeat_interval_sec: '120',
        timezone: 'Asia/Kolkata',
    });

    const trackerKindOptions = [
        TrackerDeviceKind.GPS_TRACKING,
        TrackerDeviceKind.SIM_TRACKING,
        TrackerDeviceKind.MANUAL,
        TrackerDeviceKind.DRIVER_APP,
    ];
    const trackerKindSelectOptions = trackerKindOptions.map((option) => ({ label: option, value: option }));
    const trackerProtocolOptions = Object.values(TrackerProtocol).map((protocol) => ({ label: protocol, value: protocol }));
    const trackerPowerSourceOptions = Object.values(TrackerPowerSource).map((powerSource) => ({ label: powerSource, value: powerSource }));

    const resetTrackerForm = (makePrimary = trackers.length === 0) => {
        setTrackerForm({
            device_kind: TrackerDeviceKind.GPS_TRACKING,
            is_primary: makePrimary,
            manufacturer: '',
            model: '',
            serial_number: '',
            imei: '',
            sim_iccid: '',
            mobile_number: '',
            protocol: TrackerProtocol.TELTONIKA,
            install_date: new Date().toISOString().split('T')[0],
            installer_vendor: '',
            mounting_location: 'Under Dashboard',
            power_source: TrackerPowerSource.DIRECT,
            ignition_wired: true,
            odometer_at_install: '',
            server_host: 'track.optimile.in',
            server_port: '5027',
            apn: 'airtelgprs.com',
            reporting_interval_sec: '30',
            idle_interval_sec: '300',
            heartbeat_interval_sec: '120',
            timezone: 'Asia/Kolkata',
        });
    };

    const openAddTrackerModal = () => {
        setEditingTrackerId(null);
        resetTrackerForm(trackers.length === 0);
        setIsTrackerModalOpen(true);
    };

    const openEditTrackerModal = (tracker: VehicleTrackingDevice) => {
        setEditingTrackerId(tracker.tracker_id);
        setTrackerForm({
            device_kind: tracker.device_kind,
            is_primary: tracker.is_primary,
            manufacturer: tracker.manufacturer,
            model: tracker.model,
            serial_number: tracker.serial_number,
            imei: tracker.imei,
            sim_iccid: tracker.sim_iccid || '',
            mobile_number: tracker.mobile_number || '',
            protocol: tracker.protocol,
            install_date: tracker.install_date,
            installer_vendor: tracker.installer_vendor,
            mounting_location: tracker.mounting_location,
            power_source: tracker.power_source,
            ignition_wired: tracker.ignition_wired,
            odometer_at_install: String(tracker.odometer_at_install),
            server_host: tracker.server_host,
            server_port: tracker.server_port,
            apn: tracker.apn,
            reporting_interval_sec: String(tracker.reporting_interval_sec),
            idle_interval_sec: String(tracker.idle_interval_sec),
            heartbeat_interval_sec: String(tracker.heartbeat_interval_sec),
            timezone: tracker.timezone,
        });
        setExpandedTrackerId(tracker.tracker_id);
        setIsTrackerModalOpen(true);
    };

    useEffect(() => {
        loadData();
    }, [vehicleId]);

    const loadTelemetryForPrimary = async (trackerList: VehicleTrackingDevice[]) => {
        const primary = trackerList.find((item) => item.is_primary) ?? trackerList[0] ?? null;
        const trackerTelemetry = primary
            ? await TelematicsAPI.getHistory(vehicleId, primary.tracker_id)
            : await TelematicsAPI.getHistory(vehicleId);
        setTelemetry(trackerTelemetry.sort((a,b) => new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime()));
    };

    const loadData = async () => {
        setIsLoading(true);
        const [v, d, c, s, h, th, te, em, ea, batts, allBatts, trk] = await Promise.all([
            VehicleAPI.getById(vehicleId),
            ComplianceAPI.getDocuments(vehicleId),
            ComponentAPI.getByVehicleId(vehicleId),
            MaintenanceAPI.getVehicleSchedule(vehicleId),
            MaintenanceAPI.getComponentHistory(vehicleId),
            TyreAPI.getHealthSignals(vehicleId),
            TyreAPI.getEventSignals(vehicleId),
            EnergyAPI.getMetrics(vehicleId),
            EnergyAPI.getAnomalies(vehicleId),
            BatteryAPI.getByVehicle(vehicleId),
            BatteryAPI.getAll(),
            TrackingDeviceAPI.getAllByVehicleId(vehicleId),
        ]);
        setVehicle(v || null);
        setDocuments(d.sort((a,b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()));
        setComponents(c);
        setMaintenanceSchedule(s);
        setComponentHistory(h.sort((a,b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime()));
        setTyreHealth(th);
        setTyreEvents(te.sort((a,b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()));
        setEnergyMetrics(em);
        setEnergyAnomalies(ea);
        setBatteries(batts);
        setAvailableBatteries(allBatts.filter(b => b.status === BatteryStatus.IN_STOCK));
        setTrackers(trk);
        setExpandedTrackerId((current) => current ?? trk[0]?.tracker_id ?? null);
        await loadTelemetryForPrimary(trk);
        setIsLoading(false);
    };

    const handleInstallTracker = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingTracker(true);
        try {
            const isManual = trackerForm.device_kind === TrackerDeviceKind.MANUAL;
            const isDriverApp = trackerForm.device_kind === TrackerDeviceKind.DRIVER_APP;
            const isSimTracking = trackerForm.device_kind === TrackerDeviceKind.SIM_TRACKING;
            const payload = {
                vehicle_id: vehicleId,
                device_kind: trackerForm.device_kind,
                is_primary: trackerForm.is_primary,
                manufacturer: trackerForm.manufacturer || (isManual ? 'Manual Source' : isDriverApp ? 'Optimile' : 'Unknown'),
                model: trackerForm.model || (isManual ? 'Manual Tracking' : isDriverApp ? 'Driver App' : 'Unknown'),
                serial_number: trackerForm.serial_number || `SRC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                imei: trackerForm.imei || (isManual ? `MANUAL-${vehicleId}` : isDriverApp ? `APP-${vehicleId}` : `SIM-${vehicleId}`),
                sim_iccid: trackerForm.sim_iccid || undefined,
                mobile_number: trackerForm.mobile_number || undefined,
                protocol: isManual ? TrackerProtocol.OTHER : trackerForm.protocol,
                install_date: trackerForm.install_date,
                installer_vendor: trackerForm.installer_vendor || (isDriverApp ? 'Self Activated' : 'Current User'),
                mounting_location: trackerForm.mounting_location || (isDriverApp ? 'Driver Smartphone' : isManual ? 'Virtual Source' : 'Unknown'),
                power_source: isManual ? TrackerPowerSource.BATTERY_PACK : trackerForm.power_source,
                ignition_wired: isManual ? false : trackerForm.ignition_wired,
                odometer_at_install: parseInt(trackerForm.odometer_at_install) || 0,
                server_host: isManual ? 'manual.optimile.local' : trackerForm.server_host,
                server_port: isManual ? '0' : trackerForm.server_port,
                apn: isManual ? 'manual-entry' : (isDriverApp ? 'app-data' : isSimTracking ? (trackerForm.apn || 'cellular-data') : trackerForm.apn),
                reporting_interval_sec: parseInt(trackerForm.reporting_interval_sec) || 30,
                idle_interval_sec: parseInt(trackerForm.idle_interval_sec) || 300,
                heartbeat_interval_sec: parseInt(trackerForm.heartbeat_interval_sec) || 120,
                timezone: trackerForm.timezone,
                status: TrackerStatus.ACTIVE,
                last_ping: new Date().toISOString(),
            };
            const installed = editingTrackerId
                ? await TrackingDeviceAPI.updateConfig(editingTrackerId, payload)
                : await TrackingDeviceAPI.install(payload);
            const updatedTrackers = await TrackingDeviceAPI.getAllByVehicleId(vehicleId);
            setTrackers(updatedTrackers);
            setExpandedTrackerId(installed.tracker_id);
            await loadTelemetryForPrimary(updatedTrackers);
            const updatedComps = await ComponentAPI.getByVehicleId(vehicleId);
            setComponents(updatedComps);
            setIsTrackerModalOpen(false);
            setEditingTrackerId(null);
            resetTrackerForm(false);
        } finally {
            setIsSubmittingTracker(false);
        }
    };

    const handleSetPrimaryTracker = async (trackerId: string) => {
        const updatedPrimary = await TrackingDeviceAPI.setPrimary(trackerId);
        const updatedTrackers = await TrackingDeviceAPI.getAllByVehicleId(vehicleId);
        setTrackers(updatedTrackers);
        setExpandedTrackerId(updatedPrimary.tracker_id);
        await loadTelemetryForPrimary(updatedTrackers);
    };

    const handleSwitchToSecondary = async (trackerId: string) => {
        const fallback = trackers.find((item) => item.tracker_id !== trackerId && item.status !== TrackerStatus.REMOVED);
        if (!fallback) return;
        await handleSetPrimaryTracker(fallback.tracker_id);
    };

    const handleRemoveTracker = async (trackerId: string) => {
        await TrackingDeviceAPI.remove(trackerId);
        const [updatedTrackers, updatedComponents] = await Promise.all([
            TrackingDeviceAPI.getAllByVehicleId(vehicleId),
            ComponentAPI.getByVehicleId(vehicleId),
        ]);
        setTrackers(updatedTrackers);
        setComponents(updatedComponents);
        setExpandedTrackerId(updatedTrackers[0]?.tracker_id ?? null);
        await loadTelemetryForPrimary(updatedTrackers);
    };

    const primaryTracker = trackers.find((item) => item.is_primary) ?? trackers[0] ?? null;
    const isManualTracker = trackerForm.device_kind === TrackerDeviceKind.MANUAL;
    const isDriverAppTracker = trackerForm.device_kind === TrackerDeviceKind.DRIVER_APP;
    const isSimTracker = trackerForm.device_kind === TrackerDeviceKind.SIM_TRACKING;
    const isHardwareTracker = trackerForm.device_kind === TrackerDeviceKind.GPS_TRACKING || trackerForm.device_kind === TrackerDeviceKind.SIM_TRACKING;

    const handleAddComponent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingComp(true);
        try {
            await ComponentAPI.add({
                vehicle_id: vehicleId,
                ...newComponent,
                component_type: newComponent.component_type as ComponentType,
                status: newComponent.status as ComponentStatus
            });
            setIsCompModalOpen(false);
            setNewComponent({
                component_type: ComponentType.ENGINE,
                serial_number: '',
                make: '',
                model: '',
                installation_date: new Date().toISOString().split('T')[0],
                status: ComponentStatus.ACTIVE
            });
            const c = await ComponentAPI.getByVehicleId(vehicleId);
            setComponents(c);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingComp(false);
        }
    };

    const handleUploadDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingDoc(true);
        try {
            const payload = {
                vehicle_id: vehicleId,
                ...newDocument,
                document_type: newDocument.document_type as DocumentType,
                document_url: newDocument.file_name
                    ? `https://example.com/uploads/${encodeURIComponent(newDocument.file_name)}`
                    : 'https://example.com/mock-doc.pdf',
                uploaded_by: 'Current User'
            };
            if (editingDocumentId) {
                await ComplianceAPI.updateDocument(editingDocumentId, payload);
            } else {
                await ComplianceAPI.uploadDocument(payload);
            }
            setIsDocModalOpen(false);
            setEditingDocumentId(null);
            setNewDocument({
                document_type: DocumentType.RC,
                document_number: '',
                issue_date: '',
                expiry_date: '',
                file_name: '',
                uploaded_by: 'Current User'
            });
            const d = await ComplianceAPI.getDocuments(vehicleId);
            setDocuments(d.sort((a,b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()));
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingDoc(false);
        }
    };

    const handleOpenUploadModal = () => {
        setEditingDocumentId(null);
        setNewDocument({
            document_type: DocumentType.RC,
            document_number: '',
            issue_date: '',
            expiry_date: '',
            file_name: '',
            uploaded_by: 'Current User'
        });
        setIsDocModalOpen(true);
    };

    const handleOpenEditDocument = (doc: VehicleDocument) => {
        setEditingDocumentId(doc.document_id);
        setNewDocument({
            document_type: doc.document_type,
            document_number: doc.document_number,
            issue_date: doc.issue_date,
            expiry_date: doc.expiry_date,
            file_name: doc.document_url ? decodeURIComponent(doc.document_url.split('/').pop() || '') : '',
            uploaded_by: doc.uploaded_by || 'Current User'
        });
        setIsDocModalOpen(true);
    };

    const getDocumentHistory = (doc: VehicleDocument) =>
        (doc.history && doc.history.length > 0
            ? [...doc.history].sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
            : [
                {
                    entry_id: doc.document_id,
                    action: 'Uploaded' as const,
                    changed_at: new Date().toISOString(),
                    document_number: doc.document_number,
                    issue_date: doc.issue_date,
                    expiry_date: doc.expiry_date,
                    status: doc.status,
                    document_url: doc.document_url,
                    uploaded_by: doc.uploaded_by,
                },
            ]);

    const handleBatteryInstall = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await BatteryAPI.install({
                battery_id: newBattInstall.battery_id,
                vehicle_id: vehicleId,
                installed_at: new Date().toISOString(),
                odometer: parseInt(newBattInstall.odometer)
            });
            setIsBattModalOpen(false);
            setNewBattInstall({ battery_id: '', odometer: '' });
            
            // Refresh data
            const [batts, allBatts] = await Promise.all([
                BatteryAPI.getByVehicle(vehicleId),
                BatteryAPI.getAll()
            ]);
            setBatteries(batts);
            setAvailableBatteries(allBatts.filter(b => b.status === BatteryStatus.IN_STOCK));
        } catch (error: any) {
            alert(error.message);
        }
    };

    const getDaysRemaining = (dateStr: string) => {
        const today = new Date();
        const expiry = new Date(dateStr);
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    };

    const getComputedDocStatus = (expiryDate: string) => {
        const daysLeft = getDaysRemaining(expiryDate);
        if (daysLeft < 0) return DocumentStatus.EXPIRED;
        if (daysLeft < 30) return DocumentStatus.EXPIRING_SOON;
        return DocumentStatus.VALID;
    };

    const getScheduleStatusColor = (status: string) => {
        switch(status) {
            case 'Overdue': return 'red';
            case 'Due': return 'yellow';
            default: return 'green';
        }
    };

    const getComponentStatusColor = (status: ComponentStatus) => {
        switch (status) {
            case ComponentStatus.ACTIVE:
                return 'green';
            case ComponentStatus.INACTIVE:
                return 'yellow';
            case ComponentStatus.REMOVED:
                return 'gray';
            default:
                return 'gray';
        }
    };

    const getBatteryStatusColor = (status: BatteryStatus) => {
        switch (status) {
            case BatteryStatus.INSTALLED:
                return 'green';
            case BatteryStatus.FAILED:
                return 'red';
            case BatteryStatus.SCRAPPED:
                return 'gray';
            case BatteryStatus.IN_STOCK:
            default:
                return 'yellow';
        }
    };

    if (!vehicle) return <div>Loading...</div>;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center space-x-4 mb-6">
                 <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
                    <IconArrowRight className="w-6 h-6 transform rotate-180" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{vehicle.registration_number}</h1>
                    <div className="text-sm text-gray-500 flex items-center mt-1 space-x-3">
                        <span className="font-medium">{vehicle.make} {vehicle.model}</span>
                        <span>•</span>
                        <span>{vehicle.vehicle_type}</span>
                        <Badge color={vehicle.status === 'Active' ? 'green' : vehicle.status === 'Draft' ? 'gray' : 'red'}>{vehicle.status}</Badge>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {['Overview', 'Components', 'Batteries', 'Maintenance', 'Compliance', 'Telemetry'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase() as any)}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.toLowerCase()
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Technical Specifications</h3>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Chassis No (VIN)</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{vehicle.chassis_number || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Engine No</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{vehicle.engine_number || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Make & Model</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{vehicle.make} {vehicle.model}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Mfg Year</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{vehicle.manufacturing_year || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Axle Config</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{vehicle.axle_configuration}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Body Type</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{vehicle.body_type || '-'}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Operational Details</h3>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{vehicle.status}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Fuel Type</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{vehicle.fuel_type || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Ownership</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{vehicle.ownership_type}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Payload Capacity</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{vehicle.capacity_tons} Tons</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Emission Standard</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        <Badge color={vehicle.emission_standard === EmissionStandard.BS6 ? 'green' : 'gray'}>
                                            {vehicle.emission_standard || 'BS4'}
                                        </Badge>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase">Onboarded At</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{new Date(vehicle.created_at).toLocaleDateString()}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    {primaryTracker && (
                        <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4 border-b pb-2">
                                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                    <IconCpu className="w-5 h-5 text-indigo-500" />
                                    Primary Tracking Device
                                </h3>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                        Primary
                                    </span>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${primaryTracker.status === TrackerStatus.ACTIVE ? 'bg-green-100 text-green-800' : primaryTracker.status === TrackerStatus.FAULT ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {primaryTracker.status}
                                    </span>
                                    <button onClick={() => setActiveTab('telemetry')} className="text-xs text-indigo-600 hover:underline font-medium">View Config →</button>
                                </div>
                            </div>
                            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><dt className="text-xs font-medium text-gray-500 uppercase">Device</dt><dd className="mt-1 text-gray-900 font-medium">{primaryTracker.manufacturer} {primaryTracker.model}</dd></div>
                                <div><dt className="text-xs font-medium text-gray-500 uppercase">Source</dt><dd className="mt-1 text-gray-900">{primaryTracker.device_kind}</dd></div>
                                <div><dt className="text-xs font-medium text-gray-500 uppercase">IMEI</dt><dd className="mt-1 text-gray-900 font-mono text-xs">{primaryTracker.imei}</dd></div>
                                <div><dt className="text-xs font-medium text-gray-500 uppercase">Last Ping</dt><dd className="mt-1 text-gray-900">{primaryTracker.last_ping ? new Date(primaryTracker.last_ping).toLocaleTimeString() : '—'}</dd></div>
                            </dl>
                        </div>
                    )}

                    {/* Compliance Summary — only shown when one or more documents are expired or expiring within 30 days */}
                    {(() => {
                        const atRisk = documents.filter(doc => {
                            const computed = getComputedDocStatus(doc.expiry_date);
                            return computed === DocumentStatus.EXPIRED || computed === DocumentStatus.EXPIRING_SOON;
                        });
                        if (atRisk.length === 0) return null;

                        const hasExpired = atRisk.some(d => getComputedDocStatus(d.expiry_date) === DocumentStatus.EXPIRED);

                        return (
                            <div className={`bg-white shadow rounded-lg border p-6 ${hasExpired ? 'border-red-200' : 'border-yellow-200'}`}>
                                <div className="flex items-center justify-between mb-4 border-b pb-2">
                                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                        <IconFile className={`w-5 h-5 ${hasExpired ? 'text-red-500' : 'text-yellow-500'}`} />
                                        Compliance Alert
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${hasExpired ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {atRisk.length} document{atRisk.length > 1 ? 's' : ''} at risk
                                        </span>
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('compliance')}
                                        className={`text-xs font-medium hover:underline ${hasExpired ? 'text-red-600' : 'text-yellow-600'}`}
                                    >
                                        View Compliance →
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {atRisk.map(doc => {
                                        const status = getComputedDocStatus(doc.expiry_date);
                                        const daysLeft = getDaysRemaining(doc.expiry_date);
                                        const isExpired = status === DocumentStatus.EXPIRED;
                                        return (
                                            <div
                                                key={doc.document_id}
                                                className={`rounded-lg border px-4 py-3 ${isExpired ? 'border-red-100 bg-red-50' : 'border-yellow-100 bg-yellow-50'}`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{doc.document_type}</span>
                                                    <Badge color={isExpired ? 'red' : 'yellow'}>
                                                        {isExpired ? 'Expired' : 'Expiring Soon'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm font-medium text-gray-900">{doc.document_number}</p>
                                                <p className={`text-xs mt-1 ${isExpired ? 'text-red-600' : 'text-yellow-700'}`}>
                                                    {isExpired
                                                        ? `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago`
                                                        : `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — ${new Date(doc.expiry_date).toLocaleDateString()}`
                                                    }
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {activeTab === 'components' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Major Components Registry</h3>
                        <Button size="sm" onClick={() => setIsCompModalOpen(true)}>
                            <IconPlus className="w-4 h-4 mr-2" />
                            Add Component
                        </Button>
                    </div>
                    
                    <div className="bg-white shadow overflow-hidden rounded-md border border-gray-200">
                        {components.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No components registered.</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make / Model</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Installed</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {components.map(comp => (
                                        <tr key={comp.component_id}>
                                            <td className="px-6 py-4 flex items-center text-sm font-medium text-gray-900">
                                                <IconCpu className="w-4 h-4 mr-2 text-gray-400" />
                                                {comp.component_type}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{comp.make} {comp.model}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">{comp.serial_number}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{new Date(comp.installation_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4"><Badge color={getComponentStatusColor(comp.status)}>{comp.status}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'maintenance' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Schedule */}
                    <div className="bg-white shadow rounded-lg border border-gray-200 p-5">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <IconWrench className="w-5 h-5 mr-2 text-gray-500" />
                            Upcoming Schedule
                        </h3>
                        {maintenanceSchedule.length === 0 ? (
                            <p className="text-sm text-gray-500">No preventive schedule assigned.</p>
                        ) : (
                            <div className="space-y-4">
                                {maintenanceSchedule.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500">Every {item.frequency_km}km</div>
                                        </div>
                                        <div className="text-right">
                                            <Badge color={getScheduleStatusColor(item.status)}>{item.status}</Badge>
                                            <div className="text-xs text-gray-500 mt-1">Due: {item.next_due_km}km</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* History */}
                    <div className="bg-white shadow rounded-lg border border-gray-200 p-5">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <IconHistory className="w-5 h-5 mr-2 text-gray-500" />
                            Service History
                        </h3>
                        {componentHistory.length === 0 ? (
                            <p className="text-sm text-gray-500">No service history records found.</p>
                        ) : (
                            <div className="space-y-4 max-h-80 overflow-y-auto">
                                {componentHistory.map((rec) => (
                                    <div key={rec.record_id} className="relative pl-4 border-l-2 border-gray-200 pb-2">
                                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-gray-400"></div>
                                        <div className="text-sm font-medium text-gray-900">{rec.description}</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(rec.service_date).toLocaleDateString()} • {rec.odometer} km
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Energy tab intentionally hidden for now. */}

            {activeTab === 'compliance' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Regulatory Documents</h3>
                        <Button size="sm" onClick={handleOpenUploadModal}>
                            <IconUpload className="w-4 h-4 mr-2" />
                            Upload Doc
                        </Button>
                    </div>
                    
                    <div className="bg-white shadow overflow-hidden rounded-md border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {documents.map(doc => {
                                    const daysLeft = getDaysRemaining(doc.expiry_date);
                                    const computedStatus = getComputedDocStatus(doc.expiry_date);
                                    return (
                                        <tr key={doc.document_id}>
                                            <td className="px-6 py-4 flex items-center text-sm font-medium text-gray-900">
                                                <IconFile className="w-4 h-4 mr-2 text-gray-400" />
                                                {doc.document_type}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">{doc.document_number}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="text-gray-900">{doc.expiry_date}</div>
                                                <div className={`text-xs ${daysLeft < 30 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {daysLeft < 0 ? 'Expired' : `${daysLeft} days left`}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge color={computedStatus === DocumentStatus.VALID ? 'green' : computedStatus === DocumentStatus.EXPIRING_SOON ? 'yellow' : 'red'}>{computedStatus}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedDocument(doc)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                        title="View document"
                                                    >
                                                        <IconEye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditDocument(doc)}
                                                        className="text-gray-400 hover:text-primary-600"
                                                        title="Update document"
                                                    >
                                                        <IconEdit className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'telemetry' && (
                <div className="space-y-6">
                    {/* Tracker Device Card */}
                    {trackers.length > 0 ? (
                        <div className="space-y-4">
                            {trackers.map((tracker) => {
                                const isExpanded = expandedTrackerId === tracker.tracker_id;
                                return (
                                    <div key={tracker.tracker_id} className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <IconCpu className="w-5 h-5 text-indigo-500" />
                                                <div>
                                                    <h3 className="text-base font-semibold text-gray-900">{tracker.manufacturer} {tracker.model}</h3>
                                                    <p className="text-xs text-gray-500">{tracker.device_kind} · IMEI: {tracker.imei} · S/N: {tracker.serial_number}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {tracker.is_primary ? (
                                                    <>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                                            Primary
                                                        </span>
                                                        {trackers.length > 1 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSwitchToSecondary(tracker.tracker_id)}
                                                                className="text-xs text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded px-2 py-1 bg-white"
                                                            >
                                                                Switch To Secondary
                                                            </button>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetPrimaryTracker(tracker.tracker_id)}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 rounded px-2 py-1 bg-indigo-50"
                                                    >
                                                        Switch To Primary
                                                    </button>
                                                )}
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tracker.status === TrackerStatus.ACTIVE ? 'bg-green-100 text-green-800' : tracker.status === TrackerStatus.FAULT ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                                                    ● {tracker.status}
                                                </span>
                                                <button type="button" onClick={() => openEditTrackerModal(tracker)} className="text-xs text-gray-600 hover:text-gray-900 font-medium">
                                                    Edit
                                                </button>
                                                {confirmRemoveId === tracker.tracker_id ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="text-xs text-gray-500">Remove device?</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => { handleRemoveTracker(tracker.tracker_id); setConfirmRemoveId(null); }}
                                                            className="text-xs font-semibold text-red-600 hover:text-red-800"
                                                        >
                                                            Yes, remove
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmRemoveId(null)}
                                                            className="text-xs text-gray-500 hover:text-gray-700"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmRemoveId(tracker.tracker_id)}
                                                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => setExpandedTrackerId(isExpanded ? null : tracker.tracker_id)} className="text-xs text-indigo-600 hover:underline font-medium">
                                                    {isExpanded ? 'Hide Config' : 'View Config'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-6 divide-x divide-gray-100 border-b border-gray-100">
                                            {[
                                                { label: 'Last Ping', value: tracker.last_ping ? new Date(tracker.last_ping).toLocaleString() : '—' },
                                                { label: 'Source', value: tracker.device_kind },
                                                ...(tracker.device_kind !== TrackerDeviceKind.MANUAL ? [{ label: 'Protocol', value: tracker.protocol }] : []),
                                                ...(tracker.sim_iccid ? [{ label: 'SIM / ICCID', value: tracker.sim_iccid }] : []),
                                                ...(tracker.device_kind === TrackerDeviceKind.GPS_TRACKING || tracker.device_kind === TrackerDeviceKind.SIM_TRACKING
                                                    ? [
                                                        { label: 'Power Source', value: tracker.power_source },
                                                        { label: 'Ignition Wired', value: tracker.ignition_wired ? 'Yes' : 'No' },
                                                    ]
                                                    : []),
                                                ...(tracker.mobile_number ? [{ label: 'Mobile No.', value: tracker.mobile_number }] : []),
                                            ].map(({ label, value }) => (
                                                <div key={label} className="px-5 py-4">
                                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                                                    <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{value}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {isExpanded && (
                                            <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50">
                                                {[
                                                    { label: 'Timezone', value: tracker.timezone },
                                                    { label: 'Report Interval', value: `${tracker.reporting_interval_sec}s` },
                                                    { label: 'Idle Interval', value: `${tracker.idle_interval_sec}s` },
                                                    { label: 'Heartbeat', value: `${tracker.heartbeat_interval_sec}s` },
                                                    { label: 'Installer', value: tracker.installer_vendor },
                                                    { label: 'Install Date', value: tracker.install_date },
                                                    { label: 'Mounting', value: tracker.mounting_location },
                                                    { label: 'Odom. at Install', value: `${tracker.odometer_at_install.toLocaleString()} km` },
                                                    ...(tracker.device_kind !== TrackerDeviceKind.MANUAL
                                                        ? [
                                                            { label: 'Server Host', value: tracker.server_host },
                                                            { label: 'Port', value: tracker.server_port },
                                                            { label: 'APN', value: tracker.apn || '—' },
                                                        ]
                                                        : []),
                                                ].map(({ label, value }) => (
                                                    <div key={label}>
                                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                                                        <p className="text-sm text-gray-800 mt-0.5">{value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div className="flex justify-end">
                                <Button type="button" variant="secondary" onClick={openAddTrackerModal}>
                                    <IconPlus className="w-4 h-4 mr-2" />
                                    Add Tracking Device
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white shadow rounded-lg border border-dashed border-gray-300 p-10 text-center">
                            <IconCpu className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-base font-semibold text-gray-700 mb-1">No Tracking Device Installed</h3>
                            <p className="text-sm text-gray-400 mb-5">Install a GPS tracker, driver app, or another telematics source to enable live location and telemetry features.</p>
                            <Button type="button" onClick={openAddTrackerModal}>
                                <IconPlus className="w-4 h-4 mr-2" />
                                Install Tracking Device
                            </Button>
                        </div>
                    )}

                    {/* Recent Position History */}
                    <div className="bg-white shadow rounded-lg border border-gray-200 p-5">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <IconMap className="w-5 h-5 mr-2 text-gray-500" />
                            Recent Position History
                        </h3>
                        <div className="space-y-4">
                            {telemetry.length === 0 ? (
                                <p className="text-sm text-gray-500">No telemetry data available.</p>
                            ) : (
                                telemetry.map(t => (
                                    <div key={t.event_id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0">
                                        <div className="flex items-center">
                                            <div className={`w-2 h-2 rounded-full mr-3 ${t.ignition_status ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                            <div>
                                                <div className="text-gray-900">{new Date(t.event_timestamp).toLocaleString()}</div>
                                                <div className="text-xs text-gray-500">{t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}</div>
                                            </div>
                                        </div>
                                        <div className="font-mono">{t.speed} km/h</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'batteries' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Installed Batteries</h3>
                            <p className="text-sm text-gray-500">Manage starter and auxiliary batteries.</p>
                        </div>
                        <Button size="sm" onClick={() => setIsBattModalOpen(true)}>
                            <IconPlus className="w-4 h-4 mr-2" />
                            Install Battery
                        </Button>
                    </div>
                    
                    <div className="bg-white shadow overflow-hidden rounded-md border border-gray-200">
                        {batteries.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No active batteries installed.</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specs</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warranty Exp</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {batteries.map(bat => (
                                        <tr key={bat.battery_id}>
                                            <td className="px-6 py-4 flex items-center">
                                                <IconBattery className="w-4 h-4 text-gray-400 mr-3" />
                                                <span className="text-sm font-medium text-gray-900">{bat.serial_number}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{bat.battery_type}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {bat.brand} {bat.model}
                                                <div className="text-xs text-gray-500">{bat.capacity_ah}Ah / {bat.voltage}V</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{bat.warranty_expiry_date}</td>
                                            <td className="px-6 py-4">
                                                <Badge color={getBatteryStatusColor(bat.status)}>{bat.status}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Component Modal */}
            <Modal isOpen={isCompModalOpen} onClose={() => setIsCompModalOpen(false)} title="Add Component">
                <form onSubmit={handleAddComponent}>
                    <Select 
                        label="Component Type"
                        options={Object.values(ComponentType).map(t => ({ label: t, value: t }))}
                        value={newComponent.component_type}
                        onChange={e => setNewComponent({...newComponent, component_type: e.target.value as ComponentType})}
                        required
                    />
                    <Input 
                        label="Make"
                        value={newComponent.make}
                        onChange={e => setNewComponent({...newComponent, make: e.target.value})}
                        required
                    />
                    <Input 
                        label="Model"
                        value={newComponent.model}
                        onChange={e => setNewComponent({...newComponent, model: e.target.value})}
                        required
                    />
                    <Input 
                        label="Serial Number"
                        value={newComponent.serial_number}
                        onChange={e => setNewComponent({...newComponent, serial_number: e.target.value})}
                        required
                    />
                    <Input 
                        label="Installation Date"
                        type="date"
                        value={newComponent.installation_date}
                        onChange={e => setNewComponent({...newComponent, installation_date: e.target.value})}
                        required
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsCompModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmittingComp}>Add Component</Button>
                    </div>
                </form>
            </Modal>

            {/* Document Modal */}
            <Modal
                isOpen={isDocModalOpen}
                onClose={() => {
                    setIsDocModalOpen(false);
                    setEditingDocumentId(null);
                }}
                title={editingDocumentId ? 'Update Vehicle Document' : 'Upload Vehicle Document'}
            >
                <form onSubmit={handleUploadDocument}>
                    <Select 
                        label="Document Type"
                        options={Object.values(DocumentType).map(t => ({ label: t, value: t }))}
                        value={newDocument.document_type}
                        onChange={e => setNewDocument({...newDocument, document_type: e.target.value as DocumentType})}
                        required
                    />
                    <Input 
                        label="Document Number"
                        value={newDocument.document_number}
                        onChange={e => setNewDocument({...newDocument, document_number: e.target.value})}
                        required
                        placeholder="e.g. MH46BM2849"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Issue Date"
                            type="date"
                            value={newDocument.issue_date}
                            onChange={e => setNewDocument({...newDocument, issue_date: e.target.value})}
                            required
                        />
                        <Input 
                            label="Expiry Date"
                            type="date"
                            value={newDocument.expiry_date}
                            onChange={e => setNewDocument({...newDocument, expiry_date: e.target.value})}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Document File</label>
                        <input
                            ref={docFileInputRef}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={e =>
                                setNewDocument({
                                    ...newDocument,
                                    file_name: e.target.files?.[0]?.name || '',
                                })
                            }
                        />
                        <div
                            onClick={() => docFileInputRef.current?.click()}
                            className="mt-1 flex cursor-pointer justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6 hover:bg-gray-50"
                        >
                            <div className="space-y-1 text-center">
                                <IconUpload className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <span className="relative rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                                        Upload a file
                                    </span>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                            </div>
                        </div>
                        {newDocument.file_name ? (
                            <p className="mt-2 text-xs text-green-600">Selected: {newDocument.file_name}</p>
                        ) : null}
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsDocModalOpen(false);
                                setEditingDocumentId(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmittingDoc}>
                            {editingDocumentId ? 'Update & Save' : 'Upload & Save'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(selectedDocument)}
                onClose={() => {
                    setSelectedDocument(null);
                    setIsHistoryExpanded(false);
                    setSelectedHistoryEntryId(null);
                }}
                title="View Uploaded Document"
            >
                {selectedDocument ? (
                    <div className="space-y-4">
                        {(() => {
                            const historyEntries = getDocumentHistory(selectedDocument);
                            const activeEntry =
                                historyEntries.find((entry) => entry.entry_id === selectedHistoryEntryId) || historyEntries[0];
                            return (
                                <>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="text-sm font-medium text-gray-900">{selectedDocument.document_type}</div>
                            <div className="mt-1 text-sm text-gray-500">{activeEntry.document_number}</div>
                            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-xs uppercase text-gray-400">Issue Date</div>
                                    <div className="mt-1 text-gray-900">{activeEntry.issue_date || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase text-gray-400">Expiry Date</div>
                                    <div className="mt-1 text-gray-900">{activeEntry.expiry_date}</div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase text-gray-400">Status</div>
                                    <div className="mt-1">
                                        <Badge color={activeEntry.status === DocumentStatus.VALID ? 'green' : activeEntry.status === DocumentStatus.EXPIRING_SOON ? 'yellow' : 'red'}>
                                            {activeEntry.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase text-gray-400">Uploaded By</div>
                                    <div className="mt-1 text-gray-900">{activeEntry.uploaded_by || 'Current User'}</div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-lg border border-dashed border-gray-300 p-4">
                            <div className="text-sm font-medium text-gray-900">Uploaded file</div>
                            <div className="mt-1 break-all text-sm text-gray-500">
                                {activeEntry.document_url
                                    ? decodeURIComponent(activeEntry.document_url.split('/').pop() || activeEntry.document_url)
                                    : 'No file attached'}
                            </div>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <button
                                type="button"
                                onClick={() => setIsHistoryExpanded((prev) => !prev)}
                                className="flex w-full items-center justify-between text-left"
                            >
                                <div>
                                    <div className="text-sm font-medium text-gray-900">Document history</div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        {historyEntries.length} version{historyEntries.length === 1 ? '' : 's'} available
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-primary-600">
                                    {isHistoryExpanded ? 'Collapse' : 'Expand'}
                                </span>
                            </button>
                            {isHistoryExpanded ? (
                                <div className="mt-3 space-y-2">
                                    {historyEntries.map((entry) => (
                                        <div key={entry.entry_id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {entry.action} • {entry.document_number}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500">
                                                    {new Date(entry.changed_at).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge color={entry.status === DocumentStatus.VALID ? 'green' : entry.status === DocumentStatus.EXPIRING_SOON ? 'yellow' : 'red'}>
                                                    {entry.status}
                                                </Badge>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedHistoryEntryId(entry.entry_id)}
                                                    className="text-gray-400 hover:text-gray-600"
                                                    title="Preview this version"
                                                >
                                                    <IconEye className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        <div className="flex justify-between gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => activeEntry.document_url && window.open(activeEntry.document_url, '_blank', 'noopener,noreferrer')}
                                disabled={!activeEntry.document_url}
                            >
                                <IconDownload className="mr-2 h-4 w-4" />
                                Open Document
                            </Button>
                            <div className="flex gap-3">
                                <Button type="button" variant="secondary" onClick={() => setSelectedDocument(null)}>Close</Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        const doc = selectedDocument;
                                        setSelectedDocument(null);
                                        setIsHistoryExpanded(false);
                                        setSelectedHistoryEntryId(null);
                                        if (doc) handleOpenEditDocument(doc);
                                    }}
                                >
                                    <IconEdit className="mr-2 h-4 w-4" />
                                    Update Again
                                </Button>
                            </div>
                        </div>
                                </>
                            );
                        })()}
                    </div>
                ) : null}
            </Modal>

            {/* Install / Edit Tracking Device Modal */}
            <Modal
                isOpen={isTrackerModalOpen}
                size="xl"
                onClose={() => {
                    setIsTrackerModalOpen(false);
                    setEditingTrackerId(null);
                    setShowAdvancedConfig(false);
                }}
                title={editingTrackerId ? 'Edit Tracking Device' : trackers.length > 0 ? 'Add Tracking Device' : 'Install Tracking Device'}
            >
                <form onSubmit={handleInstallTracker} className="space-y-5">

                    {/* ── Row 1: Tracking source type + primary toggle side by side ── */}
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <Select
                            label="Tracking Source"
                            options={trackerKindSelectOptions}
                            value={trackerForm.device_kind}
                            onChange={e => setTrackerForm(f => ({...f, device_kind: e.target.value as TrackerDeviceKind}))}
                        />
                        {/* Primary toggle — kept here so it's visible when choosing source type */}
                        <div className="mb-4 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
                            <input
                                id="primary_tracker"
                                type="checkbox"
                                checked={trackerForm.is_primary}
                                onChange={e => setTrackerForm(f => ({...f, is_primary: e.target.checked}))}
                                disabled={Boolean(editingTrackerId && trackers.find((item) => item.tracker_id === editingTrackerId)?.is_primary && trackers.filter((item) => item.status !== TrackerStatus.REMOVED).length <= 1)}
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <div>
                                <label htmlFor="primary_tracker" className="block text-sm font-medium text-gray-700 cursor-pointer">Set as primary device</label>
                                <p className="text-xs text-gray-400">Telemetry will be sourced from this device</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Device Details ───────────────────────────────── */}
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Device Details</p>
                        <div className="grid grid-cols-2 gap-x-4">
                            <Input
                                label={isManualTracker ? 'Source Name' : isDriverAppTracker ? 'App Provider' : 'Manufacturer'}
                                required={!isManualTracker}
                                value={trackerForm.manufacturer}
                                onChange={e => setTrackerForm(f => ({...f, manufacturer: e.target.value}))}
                                placeholder={isDriverAppTracker ? 'e.g. Optimile' : isManualTracker ? 'e.g. Control Tower' : 'e.g. Teltonika'}
                            />
                            <Input
                                label={isManualTracker ? 'Method' : 'Model'}
                                required={!isManualTracker}
                                value={trackerForm.model}
                                onChange={e => setTrackerForm(f => ({...f, model: e.target.value}))}
                                placeholder={isManualTracker ? 'e.g. Manual Dispatch Check-In' : isDriverAppTracker ? 'e.g. Driver App' : 'e.g. FMB920'}
                            />
                            {!isManualTracker && (
                                <>
                                    <Input
                                        label="Serial Number"
                                        required={isHardwareTracker}
                                        value={trackerForm.serial_number}
                                        onChange={e => setTrackerForm(f => ({...f, serial_number: e.target.value}))}
                                    />
                                    <Input
                                        label={isDriverAppTracker ? 'App Device ID' : 'IMEI'}
                                        required={!isDriverAppTracker && isHardwareTracker}
                                        value={trackerForm.imei}
                                        onChange={e => setTrackerForm(f => ({...f, imei: e.target.value}))}
                                        placeholder={isDriverAppTracker ? 'Optional device/app identifier' : '15-digit IMEI'}
                                    />
                                    {(isSimTracker || isDriverAppTracker) && (
                                        <Input
                                            label="SIM ICCID"
                                            value={trackerForm.sim_iccid}
                                            onChange={e => setTrackerForm(f => ({...f, sim_iccid: e.target.value}))}
                                        />
                                    )}
                                    <Input
                                        label="Mobile Number"
                                        value={trackerForm.mobile_number}
                                        onChange={e => setTrackerForm(f => ({...f, mobile_number: e.target.value}))}
                                        placeholder="+91..."
                                    />
                                </>
                            )}
                        </div>
                        {!isManualTracker && (
                            <Select
                                label="Protocol"
                                options={trackerProtocolOptions}
                                value={trackerForm.protocol}
                                onChange={e => setTrackerForm(f => ({...f, protocol: e.target.value as TrackerProtocol}))}
                            />
                        )}
                    </div>

                    {/* ── Section: Installation ─────────────────────────────────── */}
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Installation</p>
                        <div className="grid grid-cols-2 gap-x-4">
                            <Input
                                label="Install Date"
                                type="date"
                                required
                                value={trackerForm.install_date}
                                onChange={e => setTrackerForm(f => ({...f, install_date: e.target.value}))}
                            />
                            <Input
                                label={isDriverAppTracker ? 'Activated By' : 'Installer / Vendor'}
                                required={!isManualTracker}
                                value={trackerForm.installer_vendor}
                                onChange={e => setTrackerForm(f => ({...f, installer_vendor: e.target.value}))}
                            />
                            <Input
                                label={isDriverAppTracker ? 'Device Location' : isManualTracker ? 'Tracking Context' : 'Mounting Location'}
                                required={!isManualTracker}
                                value={trackerForm.mounting_location}
                                onChange={e => setTrackerForm(f => ({...f, mounting_location: e.target.value}))}
                            />
                            <Input
                                label="Odometer at Install (km)"
                                type="number"
                                value={trackerForm.odometer_at_install}
                                onChange={e => setTrackerForm(f => ({...f, odometer_at_install: e.target.value}))}
                            />
                        </div>
                        {isHardwareTracker && (
                            <div className="grid grid-cols-2 gap-x-4">
                                <Select
                                    label="Power Source"
                                    options={trackerPowerSourceOptions}
                                    value={trackerForm.power_source}
                                    onChange={e => setTrackerForm(f => ({...f, power_source: e.target.value as TrackerPowerSource}))}
                                />
                                {/* Aligned to same height as the select above without using pt-6 hack */}
                                <div className="mb-4 flex items-end pb-1.5">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            id="ignition_wired"
                                            type="checkbox"
                                            checked={trackerForm.ignition_wired}
                                            onChange={e => setTrackerForm(f => ({...f, ignition_wired: e.target.checked}))}
                                            className="h-4 w-4 rounded border-gray-300 text-primary-600"
                                        />
                                        <span className="text-sm text-gray-700">Ignition wired</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Section: Advanced / Network Config (collapsed by default) ── */}
                    <div className="rounded-md border border-gray-200">
                        <button
                            type="button"
                            onClick={() => setShowAdvancedConfig(v => !v)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Advanced / Network Config
                            </span>
                            <span className="text-xs text-gray-400">{showAdvancedConfig ? '▲ Hide' : '▼ Show'}</span>
                        </button>

                        {showAdvancedConfig && (
                            <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                                {isManualTracker ? (
                                    <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-500">
                                        Manual tracking uses operator-entered updates — network configuration is not required.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-x-4">
                                        <Input
                                            label="Server Host"
                                            required
                                            value={trackerForm.server_host}
                                            onChange={e => setTrackerForm(f => ({...f, server_host: e.target.value}))}
                                        />
                                        <Input
                                            label="Port"
                                            required
                                            value={trackerForm.server_port}
                                            onChange={e => setTrackerForm(f => ({...f, server_port: e.target.value}))}
                                        />
                                        <Input
                                            label="APN"
                                            value={trackerForm.apn}
                                            onChange={e => setTrackerForm(f => ({...f, apn: e.target.value}))}
                                        />
                                        <Input
                                            label="Timezone"
                                            value={trackerForm.timezone}
                                            onChange={e => setTrackerForm(f => ({...f, timezone: e.target.value}))}
                                        />
                                        <Input
                                            label="Report Interval (sec)"
                                            type="number"
                                            value={trackerForm.reporting_interval_sec}
                                            onChange={e => setTrackerForm(f => ({...f, reporting_interval_sec: e.target.value}))}
                                        />
                                        <Input
                                            label="Idle Interval (sec)"
                                            type="number"
                                            value={trackerForm.idle_interval_sec}
                                            onChange={e => setTrackerForm(f => ({...f, idle_interval_sec: e.target.value}))}
                                        />
                                        <Input
                                            label="Heartbeat Interval (sec)"
                                            type="number"
                                            value={trackerForm.heartbeat_interval_sec}
                                            onChange={e => setTrackerForm(f => ({...f, heartbeat_interval_sec: e.target.value}))}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Footer actions ────────────────────────────────────────── */}
                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsTrackerModalOpen(false);
                                setEditingTrackerId(null);
                                setShowAdvancedConfig(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmittingTracker}>
                            {editingTrackerId ? 'Save Changes' : trackers.length > 0 ? 'Add Device' : 'Install Device'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Battery Install Modal */}
            <Modal isOpen={isBattModalOpen} onClose={() => setIsBattModalOpen(false)} title="Install Battery from Stock">
                <form onSubmit={handleBatteryInstall}>
                    <Select 
                        label="Select Battery"
                        options={availableBatteries.map(b => ({ label: `${b.serial_number} (${b.brand} ${b.model})`, value: b.battery_id }))}
                        value={newBattInstall.battery_id}
                        onChange={e => setNewBattInstall({...newBattInstall, battery_id: e.target.value})}
                        required
                    />
                    {availableBatteries.length === 0 && <p className="text-xs text-red-500 -mt-3 mb-3">No batteries available in stock.</p>}
                    <Input 
                        label="Current Odometer"
                        type="number"
                        value={newBattInstall.odometer}
                        onChange={e => setNewBattInstall({...newBattInstall, odometer: e.target.value})}
                        required
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsBattModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={availableBatteries.length === 0}>Confirm Install</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
