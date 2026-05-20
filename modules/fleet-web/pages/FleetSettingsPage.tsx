import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Badge, Modal } from '../components/UI';
import { IconPlus, IconEdit, IconTrash, IconTruck, IconTyre, IconBattery, IconBox, IconWrench } from '../components/Icons';

// ── Master Data Types ──────────────────────────

interface VehicleTypeMaster {
    id: string;
    name: string;
    category: 'Truck' | 'Trailer' | 'Container' | 'Tanker' | 'Bus' | 'LCV' | 'Other';
    axle_options: string[];
    default_capacity_tons: number;
    fuel_options: string[];
    description: string;
    is_active: boolean;
}

interface TyreBrandMaster {
    id: string;
    brand: string;
    model: string;
    size: string;
    ply_rating: string;
    expected_life_km: number;
    tyre_type: 'Radial' | 'Bias' | 'Retreaded';
    application: 'Steer' | 'Drive' | 'Trailer' | 'All Position';
    cost_range_min: number;
    cost_range_max: number;
    is_active: boolean;
}

interface BatteryModelMaster {
    id: string;
    brand: string;
    model: string;
    type: 'Starter' | 'Auxiliary' | 'Inverter';
    voltage: number;
    capacity_ah: number;
    expected_life_months: number;
    warranty_months: number;
    cost_range: number;
    is_active: boolean;
}

interface InventoryCategoryMaster {
    id: string;
    name: string;
    parent_category: string;
    description: string;
    hsn_code: string;
    gst_rate: number;
    reorder_threshold: number;
    is_active: boolean;
}

type SettingsTab = 'vehicle-types' | 'tyre-brands' | 'battery-models' | 'inventory-categories';

// ── Seed Data ──────────────────────────

const SEED_VEHICLE_TYPES: VehicleTypeMaster[] = [
    { id: 'vt1', name: 'Tata Prima 4928.S', category: 'Truck', axle_options: ['6x4', '4x2'], default_capacity_tons: 28, fuel_options: ['Diesel'], description: 'Heavy duty prime mover for long haul', is_active: true },
    { id: 'vt2', name: 'Ashok Leyland 1616', category: 'Truck', axle_options: ['4x2', '6x2'], default_capacity_tons: 16, fuel_options: ['Diesel'], description: 'Medium duty ICV', is_active: true },
    { id: 'vt3', name: 'BharatBenz 5528TT', category: 'Trailer', axle_options: ['6x4'], default_capacity_tons: 55, fuel_options: ['Diesel'], description: 'Heavy trailer tractor', is_active: true },
    { id: 'vt4', name: 'Eicher Pro 3015', category: 'LCV', axle_options: ['4x2'], default_capacity_tons: 14, fuel_options: ['Diesel', 'CNG'], description: 'Light commercial vehicle', is_active: true },
    { id: 'vt5', name: 'Volvo FM 420', category: 'Container', axle_options: ['6x4'], default_capacity_tons: 35, fuel_options: ['Diesel'], description: 'Container carrier with high torque', is_active: true },
    { id: 'vt6', name: 'Tata Ultra 1518', category: 'Truck', axle_options: ['4x2'], default_capacity_tons: 15, fuel_options: ['Diesel', 'CNG'], description: 'Multi-purpose medium duty', is_active: true },
    { id: 'vt7', name: 'Scania G410', category: 'Tanker', axle_options: ['6x4', '8x4'], default_capacity_tons: 40, fuel_options: ['Diesel'], description: 'Heavy tanker configuration', is_active: false },
    { id: 'vt8', name: 'Mahindra Blazo X 28', category: 'Truck', axle_options: ['6x2'], default_capacity_tons: 28, fuel_options: ['Diesel'], description: 'Long haul with fuel efficiency', is_active: true },
];

const SEED_TYRE_BRANDS: TyreBrandMaster[] = [
    { id: 'tb1', brand: 'MRF', model: 'Steel Muscle S3F4', size: '295/80R22.5', ply_rating: '18PR', expected_life_km: 120000, tyre_type: 'Radial', application: 'Steer', cost_range_min: 18000, cost_range_max: 22000, is_active: true },
    { id: 'tb2', brand: 'MRF', model: 'Steel Muscle D2M3', size: '295/80R22.5', ply_rating: '18PR', expected_life_km: 100000, tyre_type: 'Radial', application: 'Drive', cost_range_min: 17000, cost_range_max: 21000, is_active: true },
    { id: 'tb3', brand: 'Apollo', model: 'EnduRace RD', size: '295/80R22.5', ply_rating: '16PR', expected_life_km: 110000, tyre_type: 'Radial', application: 'Drive', cost_range_min: 16000, cost_range_max: 19500, is_active: true },
    { id: 'tb4', brand: 'Apollo', model: 'EnduRace RT', size: '295/80R22.5', ply_rating: '16PR', expected_life_km: 130000, tyre_type: 'Radial', application: 'Trailer', cost_range_min: 15000, cost_range_max: 18000, is_active: true },
    { id: 'tb5', brand: 'JK Tyre', model: 'JetSteel JDH3', size: '10.00R20', ply_rating: '18PR', expected_life_km: 90000, tyre_type: 'Radial', application: 'Drive', cost_range_min: 14000, cost_range_max: 17000, is_active: true },
    { id: 'tb6', brand: 'Bridgestone', model: 'R150II', size: '295/80R22.5', ply_rating: '18PR', expected_life_km: 140000, tyre_type: 'Radial', application: 'Steer', cost_range_min: 22000, cost_range_max: 27000, is_active: true },
    { id: 'tb7', brand: 'CEAT', model: 'Winmile X3', size: '10.00R20', ply_rating: '16PR', expected_life_km: 85000, tyre_type: 'Bias', application: 'All Position', cost_range_min: 8000, cost_range_max: 11000, is_active: true },
    { id: 'tb8', brand: 'Retreaded (Generic)', model: 'Hot Retread - Drive', size: '295/80R22.5', ply_rating: '-', expected_life_km: 50000, tyre_type: 'Retreaded', application: 'Drive', cost_range_min: 5000, cost_range_max: 7000, is_active: true },
];

const SEED_BATTERY_MODELS: BatteryModelMaster[] = [
    { id: 'bm1', brand: 'Exide', model: 'DERA 880', type: 'Starter', voltage: 12, capacity_ah: 88, expected_life_months: 36, warranty_months: 24, cost_range: 8500, is_active: true },
    { id: 'bm2', brand: 'Amaron', model: 'HI-LIFE PRO 880S', type: 'Starter', voltage: 12, capacity_ah: 88, expected_life_months: 42, warranty_months: 36, cost_range: 9200, is_active: true },
    { id: 'bm3', brand: 'Exide', model: 'EEZY EZ130', type: 'Auxiliary', voltage: 12, capacity_ah: 130, expected_life_months: 30, warranty_months: 18, cost_range: 11000, is_active: true },
    { id: 'bm4', brand: 'Luminous', model: 'Red Charge RC25000', type: 'Inverter', voltage: 12, capacity_ah: 200, expected_life_months: 48, warranty_months: 36, cost_range: 15000, is_active: true },
    { id: 'bm5', brand: 'Tata Green', model: 'Silver Plus 880D', type: 'Starter', voltage: 12, capacity_ah: 88, expected_life_months: 30, warranty_months: 18, cost_range: 7500, is_active: true },
    { id: 'bm6', brand: 'SF Sonic', model: 'Flash Start FS1080-DIN80', type: 'Starter', voltage: 12, capacity_ah: 80, expected_life_months: 36, warranty_months: 24, cost_range: 8000, is_active: true },
];

const SEED_INVENTORY_CATEGORIES: InventoryCategoryMaster[] = [
    { id: 'ic1', name: 'Engine Oil', parent_category: 'Lubricants', description: 'All grades of engine oil – 15W40, 20W50', hsn_code: '2710', gst_rate: 18, reorder_threshold: 50, is_active: true },
    { id: 'ic2', name: 'Air Filters', parent_category: 'Filters', description: 'Primary and secondary air filters', hsn_code: '8421', gst_rate: 18, reorder_threshold: 25, is_active: true },
    { id: 'ic3', name: 'Oil Filters', parent_category: 'Filters', description: 'Engine oil filters for all vehicle types', hsn_code: '8421', gst_rate: 18, reorder_threshold: 30, is_active: true },
    { id: 'ic4', name: 'Fuel Filters', parent_category: 'Filters', description: 'Diesel/CNG fuel filters', hsn_code: '8421', gst_rate: 18, reorder_threshold: 20, is_active: true },
    { id: 'ic5', name: 'Brake Pads', parent_category: 'Braking System', description: 'Front and rear brake pads / shoes', hsn_code: '6813', gst_rate: 28, reorder_threshold: 15, is_active: true },
    { id: 'ic6', name: 'Brake Drums', parent_category: 'Braking System', description: 'Rear brake drums', hsn_code: '8708', gst_rate: 28, reorder_threshold: 8, is_active: true },
    { id: 'ic7', name: 'Clutch Plates', parent_category: 'Transmission', description: 'Clutch plate assemblies', hsn_code: '8708', gst_rate: 28, reorder_threshold: 5, is_active: true },
    { id: 'ic8', name: 'Coolant', parent_category: 'Lubricants', description: 'Radiator coolant – all grades', hsn_code: '3820', gst_rate: 18, reorder_threshold: 40, is_active: true },
    { id: 'ic9', name: 'Headlamp Assembly', parent_category: 'Electricals', description: 'Headlamp units – LED and halogen', hsn_code: '8512', gst_rate: 28, reorder_threshold: 10, is_active: true },
    { id: 'ic10', name: 'Fan Belts', parent_category: 'Engine Components', description: 'V-belts and serpentine belts', hsn_code: '4010', gst_rate: 18, reorder_threshold: 12, is_active: true },
];

// ── LocalStorage Helpers ──────────────────────────
const LS_KEYS = {
    vehicleTypes: 'fleet_settings_vehicle_types',
    tyreBrands: 'fleet_settings_tyre_brands',
    batteryModels: 'fleet_settings_battery_models',
    inventoryCategories: 'fleet_settings_inventory_categories',
};

function loadData<T>(key: string, seed: T[]): T[] {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
}

function saveData<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
}

// ── Main Component ──────────────────────────

export const FleetSettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('vehicle-types');

    // Data State
    const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeMaster[]>([]);
    const [tyreBrands, setTyreBrands] = useState<TyreBrandMaster[]>([]);
    const [batteryModels, setBatteryModels] = useState<BatteryModelMaster[]>([]);
    const [inventoryCategories, setInventoryCategories] = useState<InventoryCategoryMaster[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [vtForm, setVtForm] = useState({ name: '', category: 'Truck' as VehicleTypeMaster['category'], axle_options: '', default_capacity_tons: '', fuel_options: '', description: '' });
    const [tbForm, setTbForm] = useState({ brand: '', model: '', size: '', ply_rating: '', expected_life_km: '', tyre_type: 'Radial' as TyreBrandMaster['tyre_type'], application: 'Steer' as TyreBrandMaster['application'], cost_range_min: '', cost_range_max: '' });
    const [bmForm, setBmForm] = useState({ brand: '', model: '', type: 'Starter' as BatteryModelMaster['type'], voltage: '12', capacity_ah: '', expected_life_months: '', warranty_months: '', cost_range: '' });
    const [icForm, setIcForm] = useState({ name: '', parent_category: '', description: '', hsn_code: '', gst_rate: '18', reorder_threshold: '' });

    useEffect(() => {
        setVehicleTypes(loadData(LS_KEYS.vehicleTypes, SEED_VEHICLE_TYPES));
        setTyreBrands(loadData(LS_KEYS.tyreBrands, SEED_TYRE_BRANDS));
        setBatteryModels(loadData(LS_KEYS.batteryModels, SEED_BATTERY_MODELS));
        setInventoryCategories(loadData(LS_KEYS.inventoryCategories, SEED_INVENTORY_CATEGORIES));
    }, []);

    const tabs = [
        { id: 'vehicle-types' as SettingsTab, label: 'Vehicle Types', icon: IconTruck, count: vehicleTypes.length },
        { id: 'tyre-brands' as SettingsTab, label: 'Tyre Master', icon: IconTyre, count: tyreBrands.length },
        { id: 'battery-models' as SettingsTab, label: 'Battery Master', icon: IconBattery, count: batteryModels.length },
        { id: 'inventory-categories' as SettingsTab, label: 'Inventory Categories', icon: IconBox, count: inventoryCategories.length },
    ];

    // ── CRUD Handlers ──────────────────────────

    const handleOpenCreate = () => {
        setEditingItem(null);
        if (activeTab === 'vehicle-types') setVtForm({ name: '', category: 'Truck', axle_options: '', default_capacity_tons: '', fuel_options: '', description: '' });
        if (activeTab === 'tyre-brands') setTbForm({ brand: '', model: '', size: '', ply_rating: '', expected_life_km: '', tyre_type: 'Radial', application: 'Steer', cost_range_min: '', cost_range_max: '' });
        if (activeTab === 'battery-models') setBmForm({ brand: '', model: '', type: 'Starter', voltage: '12', capacity_ah: '', expected_life_months: '', warranty_months: '', cost_range: '' });
        if (activeTab === 'inventory-categories') setIcForm({ name: '', parent_category: '', description: '', hsn_code: '', gst_rate: '18', reorder_threshold: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item: any) => {
        setEditingItem(item);
        if (activeTab === 'vehicle-types') {
            const i = item as VehicleTypeMaster;
            setVtForm({ name: i.name, category: i.category, axle_options: i.axle_options.join(', '), default_capacity_tons: i.default_capacity_tons.toString(), fuel_options: i.fuel_options.join(', '), description: i.description });
        }
        if (activeTab === 'tyre-brands') {
            const i = item as TyreBrandMaster;
            setTbForm({ brand: i.brand, model: i.model, size: i.size, ply_rating: i.ply_rating, expected_life_km: i.expected_life_km.toString(), tyre_type: i.tyre_type, application: i.application, cost_range_min: i.cost_range_min.toString(), cost_range_max: i.cost_range_max.toString() });
        }
        if (activeTab === 'battery-models') {
            const i = item as BatteryModelMaster;
            setBmForm({ brand: i.brand, model: i.model, type: i.type, voltage: i.voltage.toString(), capacity_ah: i.capacity_ah.toString(), expected_life_months: i.expected_life_months.toString(), warranty_months: i.warranty_months.toString(), cost_range: i.cost_range.toString() });
        }
        if (activeTab === 'inventory-categories') {
            const i = item as InventoryCategoryMaster;
            setIcForm({ name: i.name, parent_category: i.parent_category, description: i.description, hsn_code: i.hsn_code, gst_rate: i.gst_rate.toString(), reorder_threshold: i.reorder_threshold.toString() });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (activeTab === 'vehicle-types') {
                const newItem: VehicleTypeMaster = {
                    id: editingItem?.id || `vt-${Date.now()}`,
                    name: vtForm.name,
                    category: vtForm.category,
                    axle_options: vtForm.axle_options.split(',').map(s => s.trim()).filter(Boolean),
                    default_capacity_tons: parseFloat(vtForm.default_capacity_tons),
                    fuel_options: vtForm.fuel_options.split(',').map(s => s.trim()).filter(Boolean),
                    description: vtForm.description,
                    is_active: editingItem?.is_active ?? true,
                };
                const updated = editingItem
                    ? vehicleTypes.map(v => v.id === editingItem.id ? newItem : v)
                    : [...vehicleTypes, newItem];
                setVehicleTypes(updated);
                saveData(LS_KEYS.vehicleTypes, updated);
            }

            if (activeTab === 'tyre-brands') {
                const newItem: TyreBrandMaster = {
                    id: editingItem?.id || `tb-${Date.now()}`,
                    brand: tbForm.brand,
                    model: tbForm.model,
                    size: tbForm.size,
                    ply_rating: tbForm.ply_rating,
                    expected_life_km: parseInt(tbForm.expected_life_km),
                    tyre_type: tbForm.tyre_type,
                    application: tbForm.application,
                    cost_range_min: parseFloat(tbForm.cost_range_min),
                    cost_range_max: parseFloat(tbForm.cost_range_max),
                    is_active: editingItem?.is_active ?? true,
                };
                const updated = editingItem
                    ? tyreBrands.map(t => t.id === editingItem.id ? newItem : t)
                    : [...tyreBrands, newItem];
                setTyreBrands(updated);
                saveData(LS_KEYS.tyreBrands, updated);
            }

            if (activeTab === 'battery-models') {
                const newItem: BatteryModelMaster = {
                    id: editingItem?.id || `bm-${Date.now()}`,
                    brand: bmForm.brand,
                    model: bmForm.model,
                    type: bmForm.type,
                    voltage: parseInt(bmForm.voltage),
                    capacity_ah: parseInt(bmForm.capacity_ah),
                    expected_life_months: parseInt(bmForm.expected_life_months),
                    warranty_months: parseInt(bmForm.warranty_months),
                    cost_range: parseFloat(bmForm.cost_range),
                    is_active: editingItem?.is_active ?? true,
                };
                const updated = editingItem
                    ? batteryModels.map(b => b.id === editingItem.id ? newItem : b)
                    : [...batteryModels, newItem];
                setBatteryModels(updated);
                saveData(LS_KEYS.batteryModels, updated);
            }

            if (activeTab === 'inventory-categories') {
                const newItem: InventoryCategoryMaster = {
                    id: editingItem?.id || `ic-${Date.now()}`,
                    name: icForm.name,
                    parent_category: icForm.parent_category,
                    description: icForm.description,
                    hsn_code: icForm.hsn_code,
                    gst_rate: parseInt(icForm.gst_rate),
                    reorder_threshold: parseInt(icForm.reorder_threshold),
                    is_active: editingItem?.is_active ?? true,
                };
                const updated = editingItem
                    ? inventoryCategories.map(c => c.id === editingItem.id ? newItem : c)
                    : [...inventoryCategories, newItem];
                setInventoryCategories(updated);
                saveData(LS_KEYS.inventoryCategories, updated);
            }

            setIsModalOpen(false);
        } catch (error) {
            alert('Error saving item');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        if (activeTab === 'vehicle-types') {
            const updated = vehicleTypes.filter(v => v.id !== id);
            setVehicleTypes(updated);
            saveData(LS_KEYS.vehicleTypes, updated);
        }
        if (activeTab === 'tyre-brands') {
            const updated = tyreBrands.filter(t => t.id !== id);
            setTyreBrands(updated);
            saveData(LS_KEYS.tyreBrands, updated);
        }
        if (activeTab === 'battery-models') {
            const updated = batteryModels.filter(b => b.id !== id);
            setBatteryModels(updated);
            saveData(LS_KEYS.batteryModels, updated);
        }
        if (activeTab === 'inventory-categories') {
            const updated = inventoryCategories.filter(c => c.id !== id);
            setInventoryCategories(updated);
            saveData(LS_KEYS.inventoryCategories, updated);
        }
    };

    const handleToggleActive = (id: string) => {
        if (activeTab === 'vehicle-types') {
            const updated = vehicleTypes.map(v => v.id === id ? { ...v, is_active: !v.is_active } : v);
            setVehicleTypes(updated);
            saveData(LS_KEYS.vehicleTypes, updated);
        }
        if (activeTab === 'tyre-brands') {
            const updated = tyreBrands.map(t => t.id === id ? { ...t, is_active: !t.is_active } : t);
            setTyreBrands(updated);
            saveData(LS_KEYS.tyreBrands, updated);
        }
        if (activeTab === 'battery-models') {
            const updated = batteryModels.map(b => b.id === id ? { ...b, is_active: !b.is_active } : b);
            setBatteryModels(updated);
            saveData(LS_KEYS.batteryModels, updated);
        }
        if (activeTab === 'inventory-categories') {
            const updated = inventoryCategories.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c);
            setInventoryCategories(updated);
            saveData(LS_KEYS.inventoryCategories, updated);
        }
    };

    const getModalTitle = () => {
        const action = editingItem ? 'Edit' : 'Add';
        switch (activeTab) {
            case 'vehicle-types': return `${action} Vehicle Type`;
            case 'tyre-brands': return `${action} Tyre Specification`;
            case 'battery-models': return `${action} Battery Model`;
            case 'inventory-categories': return `${action} Inventory Category`;
        }
    };

    const getAddLabel = () => {
        switch (activeTab) {
            case 'vehicle-types': return 'Add Vehicle Type';
            case 'tyre-brands': return 'Add Tyre Spec';
            case 'battery-models': return 'Add Battery Model';
            case 'inventory-categories': return 'Add Category';
        }
    };

    // ── Render Tables ──────────────────────────

    const renderVehicleTypesTable = () => (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Axle Options</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {vehicleTypes.map(vt => (
                    <tr key={vt.id} className={`hover:bg-gray-50 ${!vt.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{vt.name}</div>
                            <div className="text-xs text-gray-500">{vt.description}</div>
                        </td>
                        <td className="px-6 py-4"><Badge color="blue">{vt.category}</Badge></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{vt.axle_options.join(', ')}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{vt.default_capacity_tons}t</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{vt.fuel_options.join(', ')}</td>
                        <td className="px-6 py-4">
                            <button onClick={() => handleToggleActive(vt.id)} className="cursor-pointer">
                                <Badge color={vt.is_active ? 'green' : 'gray'}>{vt.is_active ? 'Active' : 'Inactive'}</Badge>
                            </button>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleOpenEdit(vt)} className="text-primary-600 hover:text-primary-900"><IconEdit className="w-4 h-4 inline" /></button>
                            <button onClick={() => handleDelete(vt.id)} className="text-red-600 hover:text-red-900"><IconTrash className="w-4 h-4 inline" /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderTyreBrandsTable = () => (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand / Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Application</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Life</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Range</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {tyreBrands.map(tb => (
                    <tr key={tb.id} className={`hover:bg-gray-50 ${!tb.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{tb.brand}</div>
                            <div className="text-xs text-gray-500">{tb.model}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{tb.size} <span className="text-xs text-gray-400">{tb.ply_rating}</span></td>
                        <td className="px-6 py-4"><Badge color={tb.tyre_type === 'Retreaded' ? 'yellow' : 'blue'}>{tb.tyre_type}</Badge></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{tb.application}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{(tb.expected_life_km / 1000).toFixed(0)}k km</td>
                        <td className="px-6 py-4 text-sm text-gray-500">₹{tb.cost_range_min.toLocaleString()} - ₹{tb.cost_range_max.toLocaleString()}</td>
                        <td className="px-6 py-4">
                            <button onClick={() => handleToggleActive(tb.id)} className="cursor-pointer">
                                <Badge color={tb.is_active ? 'green' : 'gray'}>{tb.is_active ? 'Active' : 'Inactive'}</Badge>
                            </button>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleOpenEdit(tb)} className="text-primary-600 hover:text-primary-900"><IconEdit className="w-4 h-4 inline" /></button>
                            <button onClick={() => handleDelete(tb.id)} className="text-red-600 hover:text-red-900"><IconTrash className="w-4 h-4 inline" /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderBatteryModelsTable = () => (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand / Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Life</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warranty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {batteryModels.map(bm => (
                    <tr key={bm.id} className={`hover:bg-gray-50 ${!bm.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{bm.brand}</div>
                            <div className="text-xs text-gray-500">{bm.model}</div>
                        </td>
                        <td className="px-6 py-4"><Badge color={bm.type === 'Starter' ? 'blue' : bm.type === 'Auxiliary' ? 'yellow' : 'green'}>{bm.type}</Badge></td>
                        <td className="px-6 py-4 text-sm text-gray-900">{bm.capacity_ah}Ah / {bm.voltage}V</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{bm.expected_life_months} months</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{bm.warranty_months} months</td>
                        <td className="px-6 py-4 text-sm text-gray-900">₹{bm.cost_range.toLocaleString()}</td>
                        <td className="px-6 py-4">
                            <button onClick={() => handleToggleActive(bm.id)} className="cursor-pointer">
                                <Badge color={bm.is_active ? 'green' : 'gray'}>{bm.is_active ? 'Active' : 'Inactive'}</Badge>
                            </button>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleOpenEdit(bm)} className="text-primary-600 hover:text-primary-900"><IconEdit className="w-4 h-4 inline" /></button>
                            <button onClick={() => handleDelete(bm.id)} className="text-red-600 hover:text-red-900"><IconTrash className="w-4 h-4 inline" /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderInventoryCategoriesTable = () => (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSN Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {inventoryCategories.map(ic => (
                    <tr key={ic.id} className={`hover:bg-gray-50 ${!ic.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{ic.name}</div>
                            <div className="text-xs text-gray-500">{ic.description}</div>
                        </td>
                        <td className="px-6 py-4"><Badge color="blue">{ic.parent_category}</Badge></td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-mono">{ic.hsn_code}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{ic.gst_rate}%</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{ic.reorder_threshold} units</td>
                        <td className="px-6 py-4">
                            <button onClick={() => handleToggleActive(ic.id)} className="cursor-pointer">
                                <Badge color={ic.is_active ? 'green' : 'gray'}>{ic.is_active ? 'Active' : 'Inactive'}</Badge>
                            </button>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleOpenEdit(ic)} className="text-primary-600 hover:text-primary-900"><IconEdit className="w-4 h-4 inline" /></button>
                            <button onClick={() => handleDelete(ic.id)} className="text-red-600 hover:text-red-900"><IconTrash className="w-4 h-4 inline" /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderTable = () => {
        switch (activeTab) {
            case 'vehicle-types': return renderVehicleTypesTable();
            case 'tyre-brands': return renderTyreBrandsTable();
            case 'battery-models': return renderBatteryModelsTable();
            case 'inventory-categories': return renderInventoryCategoriesTable();
        }
    };

    // ── Render Forms ──────────────────────────

    const renderVehicleTypeForm = () => (
        <>
            <div className="grid grid-cols-2 gap-4">
                <Input label="Type Name" value={vtForm.name} onChange={e => setVtForm({ ...vtForm, name: e.target.value })} required placeholder="e.g. Tata Prima 4928.S" />
                <Select label="Category" options={['Truck', 'Trailer', 'Container', 'Tanker', 'Bus', 'LCV', 'Other'].map(v => ({ label: v, value: v }))} value={vtForm.category} onChange={e => setVtForm({ ...vtForm, category: e.target.value as any })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input label="Axle Options (comma-separated)" value={vtForm.axle_options} onChange={e => setVtForm({ ...vtForm, axle_options: e.target.value })} placeholder="e.g. 6x4, 4x2" />
                <Input label="Default Capacity (Tons)" type="number" value={vtForm.default_capacity_tons} onChange={e => setVtForm({ ...vtForm, default_capacity_tons: e.target.value })} required />
            </div>
            <Input label="Fuel Options (comma-separated)" value={vtForm.fuel_options} onChange={e => setVtForm({ ...vtForm, fuel_options: e.target.value })} placeholder="e.g. Diesel, CNG" />
            <Input label="Description" value={vtForm.description} onChange={e => setVtForm({ ...vtForm, description: e.target.value })} placeholder="Brief description" />
        </>
    );

    const renderTyreBrandForm = () => (
        <>
            <div className="grid grid-cols-2 gap-4">
                <Input label="Brand" value={tbForm.brand} onChange={e => setTbForm({ ...tbForm, brand: e.target.value })} required placeholder="e.g. MRF" />
                <Input label="Model" value={tbForm.model} onChange={e => setTbForm({ ...tbForm, model: e.target.value })} required placeholder="e.g. Steel Muscle S3F4" />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <Input label="Size" value={tbForm.size} onChange={e => setTbForm({ ...tbForm, size: e.target.value })} required placeholder="e.g. 295/80R22.5" />
                <Input label="Ply Rating" value={tbForm.ply_rating} onChange={e => setTbForm({ ...tbForm, ply_rating: e.target.value })} placeholder="e.g. 18PR" />
                <Input label="Expected Life (km)" type="number" value={tbForm.expected_life_km} onChange={e => setTbForm({ ...tbForm, expected_life_km: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Select label="Tyre Type" options={['Radial', 'Bias', 'Retreaded'].map(v => ({ label: v, value: v }))} value={tbForm.tyre_type} onChange={e => setTbForm({ ...tbForm, tyre_type: e.target.value as any })} />
                <Select label="Application" options={['Steer', 'Drive', 'Trailer', 'All Position'].map(v => ({ label: v, value: v }))} value={tbForm.application} onChange={e => setTbForm({ ...tbForm, application: e.target.value as any })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input label="Cost Range Min (₹)" type="number" value={tbForm.cost_range_min} onChange={e => setTbForm({ ...tbForm, cost_range_min: e.target.value })} />
                <Input label="Cost Range Max (₹)" type="number" value={tbForm.cost_range_max} onChange={e => setTbForm({ ...tbForm, cost_range_max: e.target.value })} />
            </div>
        </>
    );

    const renderBatteryModelForm = () => (
        <>
            <div className="grid grid-cols-2 gap-4">
                <Input label="Brand" value={bmForm.brand} onChange={e => setBmForm({ ...bmForm, brand: e.target.value })} required placeholder="e.g. Exide" />
                <Input label="Model" value={bmForm.model} onChange={e => setBmForm({ ...bmForm, model: e.target.value })} required placeholder="e.g. DERA 880" />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <Select label="Type" options={['Starter', 'Auxiliary', 'Inverter'].map(v => ({ label: v, value: v }))} value={bmForm.type} onChange={e => setBmForm({ ...bmForm, type: e.target.value as any })} />
                <Select label="Voltage" options={[{ label: '12V', value: '12' }, { label: '24V', value: '24' }]} value={bmForm.voltage} onChange={e => setBmForm({ ...bmForm, voltage: e.target.value })} />
                <Input label="Capacity (Ah)" type="number" value={bmForm.capacity_ah} onChange={e => setBmForm({ ...bmForm, capacity_ah: e.target.value })} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <Input label="Expected Life (months)" type="number" value={bmForm.expected_life_months} onChange={e => setBmForm({ ...bmForm, expected_life_months: e.target.value })} />
                <Input label="Warranty (months)" type="number" value={bmForm.warranty_months} onChange={e => setBmForm({ ...bmForm, warranty_months: e.target.value })} />
                <Input label="Est. Cost (₹)" type="number" value={bmForm.cost_range} onChange={e => setBmForm({ ...bmForm, cost_range: e.target.value })} />
            </div>
        </>
    );

    const renderInventoryCategoryForm = () => (
        <>
            <div className="grid grid-cols-2 gap-4">
                <Input label="Category Name" value={icForm.name} onChange={e => setIcForm({ ...icForm, name: e.target.value })} required placeholder="e.g. Air Filters" />
                <Input label="Parent Category" value={icForm.parent_category} onChange={e => setIcForm({ ...icForm, parent_category: e.target.value })} required placeholder="e.g. Filters" />
            </div>
            <Input label="Description" value={icForm.description} onChange={e => setIcForm({ ...icForm, description: e.target.value })} placeholder="Brief description" />
            <div className="grid grid-cols-3 gap-4">
                <Input label="HSN Code" value={icForm.hsn_code} onChange={e => setIcForm({ ...icForm, hsn_code: e.target.value })} required placeholder="e.g. 8421" />
                <Select label="GST Rate" options={['5', '12', '18', '28'].map(v => ({ label: `${v}%`, value: v }))} value={icForm.gst_rate} onChange={e => setIcForm({ ...icForm, gst_rate: e.target.value })} />
                <Input label="Reorder Threshold" type="number" value={icForm.reorder_threshold} onChange={e => setIcForm({ ...icForm, reorder_threshold: e.target.value })} placeholder="Min stock level" />
            </div>
        </>
    );

    const renderForm = () => {
        switch (activeTab) {
            case 'vehicle-types': return renderVehicleTypeForm();
            case 'tyre-brands': return renderTyreBrandForm();
            case 'battery-models': return renderBatteryModelForm();
            case 'inventory-categories': return renderInventoryCategoryForm();
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fleet Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage master data for vehicles, tyres, batteries, and inventory.</p>
                </div>
                <Button onClick={handleOpenCreate}>
                    <IconPlus className="w-5 h-5 mr-2" />
                    {getAddLabel()}
                </Button>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex border-b border-gray-200">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-primary-500' : 'text-gray-400'}`} />
                            {tab.label}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                                }`}>{tab.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                {renderTable()}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={getModalTitle()}>
                <form onSubmit={handleSubmit} className="space-y-2">
                    {renderForm()}
                    <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>{editingItem ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
