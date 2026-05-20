import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { Vehicle, VehicleType, AxleConfiguration, VehicleStatus, Driver, OwnershipType, FuelType, BulkValidationResult, MaintenanceTemplate, EmissionStandard, MarketplaceProvider } from '../types';
import { VehicleAPI, DriverAPI, MaintenanceAPI, MarketplaceAPI } from '../services/mockDatabase';
import { Button, Input, Select, Badge, Modal } from '../components/UI';
import { IconPlus, IconSearch, IconEdit, IconTrash, IconArrowRight, IconSave, IconFileExcel, IconUploadCloud, IconCheckCircle, IconXCircle, IconAlertTriangle, IconX } from '../components/Icons';
import { VehicleDetailsPage } from './VehicleDetailsPage';

export const FleetPage: React.FC = () => {
  const location = useLocation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [marketplaceProviders, setMarketplaceProviders] = useState<MarketplaceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterOwnership, setFilterOwnership] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const activeFilterCount = [filterStatus !== '', filterType !== '', filterOwnership !== ''].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterType('');
    setFilterOwnership('');
    setCurrentPage(1);
  };

  const chip = (active: boolean) =>
    active
      ? 'rounded-lg border border-primary-600 bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700'
      : 'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50';
  const PAGE_SIZE = 10;
  // If navigated from Live Map "View Details", open that vehicle directly
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    (location.state as { openVehicleId?: string } | null)?.openVehicleId ?? null
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Bulk Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<'upload' | 'review' | 'success'>('upload');
  const [bulkValidation, setBulkValidation] = useState<BulkValidationResult | null>(null);
  const [isBulkValidating, setIsBulkValidating] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [showBulkFeatureWarning, setShowBulkFeatureWarning] = useState(false);

  // Form State
  const initialFormState = {
    registration_number: '',
    chassis_number: '',
    engine_number: '',
    make: '',
    model: '',
    manufacturing_year: '',
    vehicle_type: VehicleType.TRUCK,
    ownership_type: OwnershipType.OWNED,
    fuel_type: FuelType.DIESEL,
    emission_standard: EmissionStandard.BS6,
    axle_configuration: AxleConfiguration.AXLE_4X2,
    gvw_tons: '',
    capacity_tons: '',
    body_type: '',
    status: VehicleStatus.DRAFT,
    assigned_driver_id: '',
    maintenance_template_id: '',
    marketplace_provider_id: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [vData, dData, tData, mpData] = await Promise.all([
        VehicleAPI.getAll(),
        DriverAPI.getAll(),
        MaintenanceAPI.getTemplates(),
        MarketplaceAPI.getAll(),
      ]);
      setVehicles(vData);
      setDrivers(dData);
      setTemplates(tData);
      setMarketplaceProviders(mpData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        registration_number: vehicle.registration_number,
        chassis_number: vehicle.chassis_number || '',
        engine_number: vehicle.engine_number || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        manufacturing_year: vehicle.manufacturing_year?.toString() || '',
        vehicle_type: vehicle.vehicle_type,
        ownership_type: vehicle.ownership_type || OwnershipType.OWNED,
        fuel_type: vehicle.fuel_type || FuelType.DIESEL,
        emission_standard: vehicle.emission_standard || EmissionStandard.BS6,
        axle_configuration: vehicle.axle_configuration,
        gvw_tons: vehicle.gvw_tons?.toString() || '',
        capacity_tons: vehicle.capacity_tons.toString(),
        body_type: vehicle.body_type || '',
        status: vehicle.status,
        assigned_driver_id: vehicle.assigned_driver_id || '',
        maintenance_template_id: vehicle.maintenance_template_id || '',
        marketplace_provider_id: vehicle.marketplace_provider_id || ''
      });
    } else {
      setEditingVehicle(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Basic Validation for Active Status
      if (formData.status === VehicleStatus.ACTIVE) {
          if (!formData.chassis_number || !formData.engine_number) {
              alert("Active vehicles must have Chassis Number (VIN) and Engine Number.");
              setIsSubmitting(false);
              return;
          }
          if (!formData.make || !formData.model || !formData.manufacturing_year || !formData.body_type) {
              alert("Active vehicles must also have Make, Model, Manufacturing Year, and Body Type.");
              setIsSubmitting(false);
              return;
          }
      }

      const payload: any = {
        ...formData,
        capacity_tons: parseFloat(formData.capacity_tons),
        gvw_tons: formData.gvw_tons ? parseFloat(formData.gvw_tons) : undefined,
        manufacturing_year: formData.manufacturing_year ? parseInt(formData.manufacturing_year) : undefined,
        assigned_driver_id: formData.assigned_driver_id || null,
        maintenance_template_id: formData.maintenance_template_id || undefined
      };

      if (editingVehicle) {
        await VehicleAPI.update(editingVehicle.vehicle_id, payload);
      } else {
        await VehicleAPI.create(payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert(error?.message || "Error saving vehicle");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      await VehicleAPI.delete(id);
      fetchData();
    }
  };

  // --- Bulk Import Handlers ---
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsBulkValidating(true);
          try {
              const result = await VehicleAPI.validateBulkImport(e.target.files[0]);
              setBulkValidation(result);
              setBulkStep('review');
          } catch(e) {
              alert("Error validating file");
          } finally {
              setIsBulkValidating(false);
          }
      }
  };

  const confirmBulkImport = async () => {
      if (!bulkValidation || bulkValidation.validCount === 0) return;
      setIsBulkImporting(true);
      try {
          await VehicleAPI.importBulk(bulkValidation.parsedData);
          setBulkStep('success');
          fetchData();
      } catch (e) {
          alert("Import failed");
      } finally {
          setIsBulkImporting(false);
      }
  };

  const closeBulkModal = () => {
      setIsBulkModalOpen(false);
      setBulkStep('upload');
      setBulkValidation(null);
  };

  const handleBulkFeatureNotice = () => {
    setShowBulkFeatureWarning(true);
    window.setTimeout(() => {
      setShowBulkFeatureWarning(false);
    }, 2500);
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (v.chassis_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus ? v.status === filterStatus : true;
    const matchesType = filterType ? v.vehicle_type === filterType : true;
    const matchesOwnership = filterOwnership ? (v.ownership_type || OwnershipType.OWNED) === filterOwnership : true;
    return matchesSearch && matchesStatus && matchesType && matchesOwnership;
  });

  const totalVehiclePages = Math.max(1, Math.ceil(filteredVehicles.length / PAGE_SIZE));
  const pagedVehicles = filteredVehicles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getStatusColor = (status: VehicleStatus) => {
    switch(status) {
      case VehicleStatus.ACTIVE: return 'green';
      case VehicleStatus.INACTIVE: return 'red';
      case VehicleStatus.MAINTENANCE: return 'yellow';
      case VehicleStatus.DRAFT: return 'gray';
      case VehicleStatus.RETIRED: return 'gray';
      default: return 'gray';
    }
  };

  if (selectedVehicleId) {
      return <VehicleDetailsPage vehicleId={selectedVehicleId} onBack={() => setSelectedVehicleId(null)} />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Fleet Asset Registry</h1>
        <div className="flex space-x-3">
            <div className="relative">
              <div>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleBulkFeatureNotice}
                >
                    <IconFileExcel className="w-5 h-5 mr-2" />
                    Bulk Onboard
                </Button>
              </div>
            </div>
            <Button onClick={() => handleOpenModal()}>
                <IconPlus className="w-5 h-5 mr-2" />
                Onboard Vehicle
            </Button>
        </div>
      </div>

      {showBulkFeatureWarning ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <IconAlertTriangle className="h-4 w-4 shrink-0" />
          Bulk upload is not enabled yet.
        </div>
      ) : null}

      {/* Search + Filter */}
      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-gray-700">
            {filteredVehicles.length} <span className="font-normal text-gray-400">of {vehicles.length} vehicles</span>
          </p>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none ring-primary-600/20 placeholder:text-gray-400 focus:border-primary-500 focus:ring-4"
                placeholder="Search by reg no or VIN…"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                showFilters || activeFilterCount > 0
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active filter tag strip */}
        {(activeFilterCount > 0 || searchTerm.trim()) && !showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400">Active filters:</span>

            {searchTerm.trim() && (
              <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                Search: "{searchTerm}"
                <button type="button" aria-label="Clear search" onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="ml-0.5 text-gray-400 hover:text-gray-600">
                  <IconX className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterType && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                Type: {filterType}
                <button type="button" aria-label="Clear type filter" onClick={() => { setFilterType(''); setCurrentPage(1); }} className="ml-0.5 text-primary-400 hover:text-primary-600">
                  <IconX className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                Status: {filterStatus}
                <button type="button" aria-label="Clear status filter" onClick={() => { setFilterStatus(''); setCurrentPage(1); }} className="ml-0.5 text-primary-400 hover:text-primary-600">
                  <IconX className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterOwnership && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                Ownership: {filterOwnership}
                <button type="button" aria-label="Clear ownership filter" onClick={() => { setFilterOwnership(''); setCurrentPage(1); }} className="ml-0.5 text-primary-400 hover:text-primary-600">
                  <IconX className="h-3 w-3" />
                </button>
              </span>
            )}
            <button type="button" onClick={clearFilters} className="text-xs font-medium text-gray-400 underline underline-offset-2 hover:text-gray-600">
              Clear all
            </button>
          </div>
        )}

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="grid gap-5 sm:grid-cols-3">

              {/* Vehicle Type */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vehicle Type</p>
                <div className="flex flex-wrap gap-2">
                  {(['', ...Object.values(VehicleType)] as const).map((option) => (
                    <button key={option} type="button" onClick={() => { setFilterType(option); setCurrentPage(1); }} className={chip(filterType === option)}>
                      {option === '' ? 'All' : option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(['', ...Object.values(VehicleStatus)] as const).map((option) => (
                    <button key={option} type="button" onClick={() => { setFilterStatus(option); setCurrentPage(1); }} className={chip(filterStatus === option)}>
                      {option === '' ? 'All' : option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ownership */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ownership</p>
                <div className="flex flex-wrap gap-2">
                  {(['', ...Object.values(OwnershipType)] as const).map((option) => (
                    <button key={option} type="button" onClick={() => { setFilterOwnership(option); setCurrentPage(1); }} className={chip(filterOwnership === option)}>
                      {option === '' ? 'All' : option}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {(activeFilterCount > 0 || searchTerm.trim()) && (
              <div className="mt-4">
                <button type="button" onClick={clearFilters} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-800">
                  <IconX className="h-3 w-3" />
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading fleet data...</div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-gray-700">No vehicles match your filters.</p>
            <button type="button" onClick={clearFilters} className="mt-2 text-sm text-primary-600 hover:underline">
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Info</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Config</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ownership</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marketplace</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pagedVehicles.map((vehicle) => (
                    <tr key={vehicle.vehicle_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{vehicle.registration_number}</div>
                          <div className="text-xs text-gray-500">VIN: {vehicle.chassis_number || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{vehicle.vehicle_type}</div>
                          <div className="text-xs text-gray-500">{vehicle.axle_configuration}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{vehicle.make} {vehicle.model}</div>
                          <div className="text-xs">{vehicle.gvw_tons ? `GVW: ${vehicle.gvw_tons}t` : ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <Badge color="blue">
                            {vehicle.ownership_type || OwnershipType.OWNED}
                          </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {vehicle.marketplace_provider_id ? (() => {
                          const p = marketplaceProviders.find(mp => mp.provider_id === vehicle.marketplace_provider_id);
                          return p ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{p.name}</div>
                              <div className="text-xs text-gray-400">{p.category} · {p.city}</div>
                            </div>
                          ) : <span className="text-xs text-gray-400">—</span>;
                        })() : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <Badge color={vehicle.emission_standard === EmissionStandard.BS6 ? 'green' : 'gray'}>
                              {vehicle.emission_standard || 'BS4'}
                          </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge color={getStatusColor(vehicle.status)}>{vehicle.status}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end space-x-2">
                         <button onClick={() => setSelectedVehicleId(vehicle.vehicle_id)} className="text-gray-400 hover:text-gray-600">
                          <IconArrowRight className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleOpenModal(vehicle)} className="text-primary-600 hover:text-primary-900">
                          <IconEdit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(vehicle.vehicle_id)} className="text-red-600 hover:text-red-900">
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filteredVehicles.length > PAGE_SIZE && (
              <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 bg-white">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredVehicles.length)} of {filteredVehicles.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalVehiclePages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalVehiclePages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`px-3 py-1.5 text-sm border rounded-md ${currentPage === p ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'}`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalVehiclePages, p + 1))}
                    disabled={currentPage === totalVehiclePages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Deep Onboarding Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingVehicle ? "Edit Asset" : "Onboard New Asset"}>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Identification */}
          <div>
              <h3 className="text-sm font-medium text-gray-900 border-b pb-1 mb-3">Identification</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Registration Number" 
                    value={formData.registration_number}
                    onChange={e => setFormData({...formData, registration_number: e.target.value})}
                    required
                    placeholder="e.g. MH-12-AB-1234"
                />
                <Input 
                    label="Chassis Number (VIN)" 
                    value={formData.chassis_number}
                    onChange={e => setFormData({...formData, chassis_number: e.target.value})}
                    placeholder="Enter VIN"
                />
                <Input 
                    label="Engine Number" 
                    value={formData.engine_number}
                    onChange={e => setFormData({...formData, engine_number: e.target.value})}
                    placeholder="Enter Engine No"
                />
                <Select
                    label="Ownership"
                    options={Object.values(OwnershipType).map(v => ({ label: v, value: v }))}
                    value={formData.ownership_type}
                    onChange={e => setFormData({...formData, ownership_type: e.target.value as OwnershipType, marketplace_provider_id: ''})}
                />
              </div>

              {/* Marketplace provider — required for Rented or Leased vehicles */}
              {(formData.ownership_type === OwnershipType.RENTED || formData.ownership_type === OwnershipType.LEASED) && (
                <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50/50 px-4 py-3">
                  <Select
                    label="Marketplace Provider *"
                    options={[
                      { label: 'Select a provider…', value: '' },
                      ...marketplaceProviders
                        .filter(p => p.status === 'Active')
                        .map(p => ({ label: `${p.name} — ${p.city} (${p.category})`, value: p.provider_id }))
                    ]}
                    value={formData.marketplace_provider_id}
                    onChange={e => setFormData({...formData, marketplace_provider_id: e.target.value})}
                    required
                  />
                  {!formData.marketplace_provider_id && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      A marketplace provider must be selected for {formData.ownership_type.toLowerCase()} vehicles.
                    </p>
                  )}
                  {formData.marketplace_provider_id && (
                    <p className="mt-1 text-xs text-gray-500">
                      Vehicle will be tagged to this provider in the Marketplace registry.
                    </p>
                  )}
                  <button
                    type="button"
                    className="mt-1 text-xs font-medium text-primary-600 hover:underline"
                    onClick={() => window.open('/fleet/marketplace', '_blank')}
                  >
                    + Add or manage providers →
                  </button>
                </div>
              )}
          </div>

          {/* Section 2: Technical Specs */}
          <div>
              <h3 className="text-sm font-medium text-gray-900 border-b pb-1 mb-3">Technical Specifications</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Make" 
                    value={formData.make}
                    onChange={e => setFormData({...formData, make: e.target.value})}
                    placeholder="e.g. Tata"
                />
                <Input 
                    label="Model" 
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                    placeholder="e.g. Prima"
                />
                <Select 
                    label="Vehicle Type"
                    options={Object.values(VehicleType).map(v => ({ label: v, value: v }))}
                    value={formData.vehicle_type}
                    onChange={e => setFormData({...formData, vehicle_type: e.target.value as VehicleType})}
                    required
                />
                <Select 
                    label="Fuel Type"
                    options={Object.values(FuelType).map(v => ({ label: v, value: v }))}
                    value={formData.fuel_type}
                    onChange={e => setFormData({...formData, fuel_type: e.target.value as FuelType})}
                />
                <Select 
                    label="Emission Standard"
                    options={Object.values(EmissionStandard).map(v => ({ label: v, value: v }))}
                    value={formData.emission_standard}
                    onChange={e => setFormData({...formData, emission_standard: e.target.value as EmissionStandard})}
                    required
                />
                <Select 
                    label="Axle Config"
                    options={Object.values(AxleConfiguration).map(v => ({ label: v, value: v }))}
                    value={formData.axle_configuration}
                    onChange={e => setFormData({...formData, axle_configuration: e.target.value as AxleConfiguration})}
                    required
                />
                <Input 
                    label="Mfg Year" 
                    type="number"
                    value={formData.manufacturing_year}
                    onChange={e => setFormData({...formData, manufacturing_year: e.target.value})}
                    placeholder="YYYY"
                />
                <Input 
                    label="GVW (Tons)" 
                    type="number"
                    step="0.1"
                    value={formData.gvw_tons}
                    onChange={e => setFormData({...formData, gvw_tons: e.target.value})}
                />
                <Input 
                    label="Payload Capacity (Tons)" 
                    type="number"
                    step="0.1"
                    value={formData.capacity_tons}
                    onChange={e => setFormData({...formData, capacity_tons: e.target.value})}
                    required
                />
              </div>
          </div>

          {/* Section 3: Operational */}
          <div>
              <h3 className="text-sm font-medium text-gray-900 border-b pb-1 mb-3">Operational Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <Select 
                    label="Status"
                    options={Object.values(VehicleStatus).map(v => ({ label: v, value: v }))}
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as VehicleStatus})}
                    required
                />
                <Select 
                    label="Assigned Driver"
                    options={[
                    { label: 'Unassigned', value: '' },
                    ...drivers
                        .filter(d => d.status === 'Active' && (!d.assigned_vehicle_id || d.assigned_vehicle_id === editingVehicle?.vehicle_id))
                        .map(d => ({ label: d.name, value: d.driver_id }))
                    ]}
                    value={formData.assigned_driver_id}
                    onChange={e => setFormData({...formData, assigned_driver_id: e.target.value})}
                />
                <div className="col-span-2">
                    <Select 
                        label="Maintenance Template"
                        options={[
                            { label: 'No Template Selected', value: '' },
                            ...templates.map(t => ({ label: t.name, value: t.template_id }))
                        ]}
                        value={formData.maintenance_template_id}
                        onChange={e => setFormData({...formData, maintenance_template_id: e.target.value})}
                    />
                    <p className="text-xs text-gray-500 mt-1">Assigns preventive maintenance schedule automatically.</p>
                </div>
              </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            {formData.status === VehicleStatus.DRAFT ? (
                 <Button type="submit" isLoading={isSubmitting} variant="secondary">
                    <IconSave className="w-4 h-4 mr-2" />
                    Save Draft
                 </Button>
            ) : (
                <Button type="submit" isLoading={isSubmitting}>
                    {editingVehicle ? 'Update Asset' : 'Onboard Asset'}
                </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};
