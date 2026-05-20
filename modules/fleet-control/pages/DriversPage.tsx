import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { Driver, DriverStatus, Vehicle, DriverType, BulkValidationResult } from '../types';
import { DriverAPI, VehicleAPI } from '../services/mockDatabase';
import { Button, Input, Select, Badge, Modal } from '../components/UI';
import { IconPlus, IconSearch, IconEdit, IconAlert, IconArrowRight, IconSave, IconUsers, IconUpload, IconFileExcel, IconUploadCloud, IconCheckCircle, IconXCircle, IconAlertTriangle, IconX } from '../components/Icons';
import { DriverDetailsPage } from './DriverDetailsPage';

export const DriversPage: React.FC = () => {
  const location = useLocation();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLicenseExpiry, setFilterLicenseExpiry] = useState<'All' | 'Expiring Soon'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const activeFilterCount = [filterStatus !== '', filterType !== '', filterLicenseExpiry !== 'All'].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterType('');
    setFilterLicenseExpiry('All');
    setCurrentPage(1);
  };
  const PAGE_SIZE = 10;
  // If navigated from Live Map "View Profile", open that driver directly
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
    (location.state as { openDriverId?: string } | null)?.openDriverId ?? null
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Bulk Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<'upload' | 'review' | 'success'>('upload');
  const [bulkValidation, setBulkValidation] = useState<BulkValidationResult | null>(null);
  const [isBulkValidating, setIsBulkValidating] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    phone: '',
    alternate_phone: '',
    license_number: '',
    license_expiry_date: '',
    driver_type: DriverType.PERMANENT,
    employment_start_date: '',
    home_location: '',
    status: DriverStatus.DRAFT,
    assigned_vehicle_id: '',
    profile_picture_url: ''
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dData, vData] = await Promise.all([
        DriverAPI.getAll(),
        VehicleAPI.getAll()
      ]);
      setDrivers(dData);
      setVehicles(vData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        name: driver.name,
        phone: driver.phone,
        alternate_phone: driver.alternate_phone || '',
        license_number: driver.license_number,
        license_expiry_date: driver.license_expiry_date,
        driver_type: driver.driver_type,
        employment_start_date: driver.employment_start_date || '',
        home_location: driver.home_location || '',
        status: driver.status,
        assigned_vehicle_id: driver.assigned_vehicle_id || '',
        profile_picture_url: driver.profile_picture_url || ''
      });
    } else {
      setEditingDriver(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setFormData({ ...formData, profile_picture_url: imageUrl });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        assigned_vehicle_id: formData.assigned_vehicle_id || null
      };

      if (editingDriver) {
        await DriverAPI.update(editingDriver.driver_id, payload);
      } else {
        await DriverAPI.create(payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert("Error saving driver");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Bulk Import Handlers ---
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsBulkValidating(true);
      try {
        const result = await DriverAPI.validateBulkImport(e.target.files[0]);
        setBulkValidation(result);
        setBulkStep('review');
      } catch (e) {
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
      await DriverAPI.importBulk(bulkValidation.parsedData);
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

  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 30;
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.license_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.phone || '').includes(searchTerm);
    const matchesStatus = filterStatus ? d.status === filterStatus : true;
    const matchesType = filterType ? d.driver_type === filterType : true;
    const matchesExpiry = filterLicenseExpiry === 'All' || isExpiringSoon(d.license_expiry_date);
    return matchesSearch && matchesStatus && matchesType && matchesExpiry;
  });

  const totalDriverPages = Math.max(1, Math.ceil(filteredDrivers.length / PAGE_SIZE));
  const pagedDrivers = filteredDrivers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getVehicleReg = (id: string | null) => {
    if (!id) return '-';
    return vehicles.find(v => v.vehicle_id === id)?.registration_number || 'Unknown';
  };

  const getStatusColor = (status: DriverStatus) => {
    switch (status) {
      case DriverStatus.ACTIVE: return 'green';
      case DriverStatus.INACTIVE: return 'gray';
      case DriverStatus.SUSPENDED: return 'red';
      case DriverStatus.ON_LEAVE: return 'yellow';
      case DriverStatus.DRAFT: return 'blue';
      default: return 'gray';
    }
  };

  if (selectedDriverId) {
    return <DriverDetailsPage driverId={selectedDriverId} onBack={() => setSelectedDriverId(null)} />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Driver Asset Master</h1>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={() => setIsBulkModalOpen(true)}>
            <IconFileExcel className="w-5 h-5 mr-2" />
            Bulk Onboard
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <IconPlus className="w-5 h-5 mr-2" />
            Onboard Driver
          </Button>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="mb-2 overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: title + count */}
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {filteredDrivers.length} <span className="font-normal text-gray-400">of {drivers.length} drivers</span>
            </p>
          </div>

          {/* Right: search + filter toggle */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none ring-primary-600/20 placeholder:text-gray-400 focus:border-primary-500 focus:ring-4"
                placeholder="Search by name, licence or phone…"
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

        {/* Active filter tag strip — visible when panel is closed but filters are on */}
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

            {filterLicenseExpiry !== 'All' && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                Licence: {filterLicenseExpiry}
                <button type="button" aria-label="Clear licence expiry filter" onClick={() => setFilterLicenseExpiry('All')} className="ml-0.5 text-primary-400 hover:text-primary-600">
                  <IconX className="h-3 w-3" />
                </button>
              </span>
            )}

            <button type="button" onClick={clearFilters} className="text-xs font-medium text-gray-400 underline underline-offset-2 hover:text-gray-600">
              Clear all
            </button>
          </div>
        )}

        {/* Expandable filter panel — chips, no dropdowns, instant apply on tap */}
        {showFilters && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="grid gap-5 sm:grid-cols-3">

              {/* Driver Type */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Driver Type</p>
                <div className="flex flex-wrap gap-2">
                  {(['', ...Object.values(DriverType)] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => { setFilterType(option); setCurrentPage(1); }}
                      className={filterType === option
                        ? 'rounded-lg border border-primary-600 bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700'
                        : 'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50'
                      }
                    >
                      {option === '' ? 'All' : option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(['', ...Object.values(DriverStatus)] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => { setFilterStatus(option); setCurrentPage(1); }}
                      className={filterStatus === option
                        ? 'rounded-lg border border-primary-600 bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700'
                        : 'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50'
                      }
                    >
                      {option === '' ? 'All' : option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Licence Expiry */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Licence Expiry</p>
                <div className="flex flex-wrap gap-2">
                  {(['All', 'Expiring Soon'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => { setFilterLicenseExpiry(option); setCurrentPage(1); }}
                      className={filterLicenseExpiry === option
                        ? 'rounded-lg border border-primary-600 bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700'
                        : 'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50'
                      }
                    >
                      {option === 'Expiring Soon' ? 'Expiring Soon (≤ 30 days)' : option}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {(activeFilterCount > 0 || searchTerm.trim()) && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-800"
                >
                  <IconX className="h-3 w-3" />
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading driver data...</div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-gray-700">No drivers match your filters.</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagedDrivers.map((driver) => {
                  const expiring = isExpiringSoon(driver.license_expiry_date);
                  return (
                    <tr key={driver.driver_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 mr-3">
                          {driver.profile_picture_url ? (
                            <img className="h-10 w-10 rounded-full object-cover border border-gray-200" src={driver.profile_picture_url} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold border border-gray-300">
                              {driver.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                          <div className="text-xs text-gray-500">{driver.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{driver.license_number}</div>
                        <div className={`text-xs flex items-center ${expiring ? 'text-red-600' : 'text-gray-500'}`}>
                          Exp: {driver.license_expiry_date}
                          {expiring && <IconAlert className="w-3 h-3 ml-1" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {driver.assigned_vehicle_id ? (
                          <span className="font-medium text-gray-900">{getVehicleReg(driver.assigned_vehicle_id)}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                        <div className="text-xs">{driver.assigned_hub || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.driver_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge color={getStatusColor(driver.status)}>{driver.status}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end space-x-2">
                        <button onClick={() => setSelectedDriverId(driver.driver_id)} className="text-gray-400 hover:text-gray-600">
                          <IconArrowRight className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleOpenModal(driver)} className="text-primary-600 hover:text-primary-900">
                          <IconEdit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {filteredDrivers.length > PAGE_SIZE && (
            <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 bg-white">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredDrivers.length)} of {filteredDrivers.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalDriverPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalDriverPages || Math.abs(p - currentPage) <= 1)
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
                  onClick={() => setCurrentPage(p => Math.min(totalDriverPages, p + 1))}
                  disabled={currentPage === totalDriverPages}
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDriver ? "Edit Driver" : "Onboard New Driver"}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 border-b pb-1 mb-3">Identity & Contact</h3>

            <div className="flex items-center space-x-6 mb-4">
              <div className="shrink-0">
                {formData.profile_picture_url ? (
                  <img className="h-16 w-16 object-cover rounded-full border border-gray-200" src={formData.profile_picture_url} alt="Preview" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 border border-gray-300">
                    <IconUsers className="h-8 w-8" />
                  </div>
                )}
              </div>
              <label className="block">
                <span className="sr-only">Choose profile photo</span>
                <div className="relative">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary-50 file:text-primary-700
                      hover:file:bg-primary-100
                    "/>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Select
                label="Driver Type"
                options={Object.values(DriverType).map(v => ({ label: v, value: v }))}
                value={formData.driver_type}
                onChange={e => setFormData({ ...formData, driver_type: e.target.value as DriverType })}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              <Input
                label="Alt Phone (Optional)"
                type="tel"
                value={formData.alternate_phone}
                onChange={e => setFormData({ ...formData, alternate_phone: e.target.value })}
              />
              <Input
                label="Home Location"
                value={formData.home_location}
                onChange={e => setFormData({ ...formData, home_location: e.target.value })}
                placeholder="City, State"
              />
              <Input
                label="Joined Date"
                type="date"
                value={formData.employment_start_date}
                onChange={e => setFormData({ ...formData, employment_start_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 border-b pb-1 mb-3">Primary License</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="License Number"
                value={formData.license_number}
                onChange={e => setFormData({ ...formData, license_number: e.target.value })}
                required
              />
              <Input
                label="Expiry Date"
                type="date"
                value={formData.license_expiry_date}
                onChange={e => setFormData({ ...formData, license_expiry_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 border-b pb-1 mb-3">Assignment & Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                options={Object.values(DriverStatus).map(v => ({ label: v, value: v }))}
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as DriverStatus })}
                required
              />
              <Select
                label="Assign Vehicle"
                options={[
                  { label: 'Unassigned', value: '' },
                  ...vehicles
                    .filter(v => !v.assigned_driver_id || v.assigned_driver_id === editingDriver?.driver_id)
                    .map(v => ({ label: v.registration_number, value: v.vehicle_id }))
                ]}
                value={formData.assigned_vehicle_id}
                onChange={e => setFormData({ ...formData, assigned_vehicle_id: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            {formData.status === DriverStatus.DRAFT ? (
              <Button type="submit" isLoading={isSubmitting} variant="secondary">
                <IconSave className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            ) : (
              <Button type="submit" isLoading={isSubmitting}>
                {editingDriver ? 'Update Driver' : 'Onboard Driver'}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal isOpen={isBulkModalOpen} onClose={closeBulkModal} title="Bulk Driver Onboarding">
        {bulkStep === 'upload' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-md p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">Before you upload:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use the standard multi-sheet Excel template.</li>
                <li>Sheets: <strong>Core, License, Documents, Skills</strong>.</li>
                <li>Phone numbers must be unique and valid.</li>
                <li>Mandatory fields: Name, Phone, License No, License Expiry.</li>
              </ul>
              <a href="#" className="mt-2 inline-block text-blue-600 underline hover:text-blue-800">Download Template</a>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-10 hover:bg-gray-50 transition-colors">
              <IconUploadCloud className="w-12 h-12 text-gray-400 mb-4" />
              {isBulkValidating ? (
                <div className="text-gray-500 font-medium animate-pulse">Validating Driver Data...</div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-2">Drag and drop your Excel file here</p>
                  <label className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Browse File
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleBulkUpload} />
                  </label>
                </>
              )}
            </div>
          </div>
        )}

        {bulkStep === 'review' && bulkValidation && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 p-3 rounded border border-green-100">
                <div className="text-2xl font-bold text-green-700">{bulkValidation.validCount}</div>
                <div className="text-xs text-green-600 font-medium">Valid Drivers</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                <div className="text-2xl font-bold text-yellow-700">{bulkValidation.warningCount}</div>
                <div className="text-xs text-yellow-600 font-medium">Warnings</div>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-100">
                <div className="text-2xl font-bold text-red-700">{bulkValidation.errorCount}</div>
                <div className="text-xs text-red-600 font-medium">Errors</div>
              </div>
            </div>

            {bulkValidation.errors.length > 0 && (
              <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bulkValidation.errors.map((err, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-xs text-gray-900">{err.row}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{err.column}</td>
                        <td className="px-4 py-2 text-xs">
                          <span className={`inline-flex items-center ${err.type === 'Error' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {err.type === 'Error' ? <IconXCircle className="w-3 h-3 mr-1" /> : <IconAlertTriangle className="w-3 h-3 mr-1" />}
                            {err.message}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setBulkStep('upload')}>Back</Button>
              <Button
                onClick={confirmBulkImport}
                isLoading={isBulkImporting}
                disabled={bulkValidation.validCount === 0}
              >
                Import {bulkValidation.validCount} Drivers (Draft)
              </Button>
            </div>
          </div>
        )}

        {bulkStep === 'success' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <IconCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Import Successful</h3>
            <p className="text-sm text-gray-500 mb-6">
              Drivers have been saved as <strong>Draft</strong>. <br />
              Please review profile and upload pending documents to Activate.
            </p>
            <Button onClick={closeBulkModal}>Done</Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
