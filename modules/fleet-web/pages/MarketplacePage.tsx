import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketplaceProvider, MarketplaceProviderCategory, Vehicle } from '../types';
import { MarketplaceAPI, VehicleAPI } from '../services/mockDatabase';
import { Badge, Button, Input, Modal, Select } from '../components/UI';
import { IconPlus, IconEdit, IconTruck, IconUsers, IconArrowRight, IconX } from '../components/Icons';

const CATEGORY_OPTIONS: { label: string; value: MarketplaceProviderCategory }[] = [
  { label: 'Rental',   value: 'Rental'   },
  { label: 'Leasing',  value: 'Leasing'  },
  { label: 'Contract', value: 'Contract' },
];

const categoryColor = (c: MarketplaceProviderCategory) => {
  if (c === 'Rental')  return 'blue';
  if (c === 'Leasing') return 'yellow';
  return 'gray';
};

const initialForm = {
  name: '',
  category: 'Rental' as MarketplaceProviderCategory,
  contact_name: '',
  phone: '',
  email: '',
  city: '',
  status: 'Active' as 'Active' | 'Inactive',
};

export const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [vehicleCounts, setVehicleCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProvider, setEditingProvider] = useState<MarketplaceProvider | null>(null);
  const [formData, setFormData] = useState(initialForm);
  // Drawer: which provider's vehicles are being viewed
  const [drawerProvider, setDrawerProvider] = useState<MarketplaceProvider | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [p, v] = await Promise.all([MarketplaceAPI.getAll(), VehicleAPI.getAll()]);
      setProviders(p);
      setAllVehicles(v);
      const counts: Record<string, number> = {};
      p.forEach(pr => {
        counts[pr.provider_id] = v.filter(veh => veh.marketplace_provider_id === pr.provider_id).length;
      });
      setVehicleCounts(counts);
    } finally {
      setIsLoading(false);
    }
  };

  const drawerVehicles = drawerProvider
    ? allVehicles.filter(v => v.marketplace_provider_id === drawerProvider.provider_id)
    : [];

  const openAdd = () => {
    setEditingProvider(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const openEdit = (p: MarketplaceProvider) => {
    setEditingProvider(p);
    setFormData({
      name: p.name,
      category: p.category,
      contact_name: p.contact_name,
      phone: p.phone,
      email: p.email ?? '',
      city: p.city,
      status: p.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProvider) {
        await MarketplaceAPI.update(editingProvider.provider_id, formData);
      } else {
        await MarketplaceAPI.create(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const f = formData;
  const set = (key: keyof typeof initialForm, val: string) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace Providers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage rental, leasing and contract vehicle providers. Vehicles onboarded as <strong>Rented</strong> or <strong>Leased</strong> can be linked to a provider here.
          </p>
        </div>
        <Button onClick={openAdd}>
          <IconPlus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(['All', 'Rental', 'Leasing', 'Contract'] as const).map(cat => {
          const count = cat === 'All'
            ? providers.filter(p => p.status === 'Active').length
            : providers.filter(p => p.category === cat && p.status === 'Active').length;
          return (
            <div key={cat} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{cat === 'All' ? 'Active Providers' : cat}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Provider cards */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading providers…</div>
      ) : providers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-sm font-medium text-gray-600">No providers onboarded yet.</p>
          <p className="mt-1 text-xs text-gray-400">Add your first rental or leasing partner.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map(provider => {
            const vCount = vehicleCounts[provider.provider_id] ?? 0;
            return (
              <div key={provider.provider_id} className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                {/* Card header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-gray-900">{provider.name}</h3>
                    <p className="text-xs text-gray-400">{provider.city}</p>
                  </div>
                  <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                    <Badge color={categoryColor(provider.category)}>{provider.category}</Badge>
                    {provider.status === 'Inactive' && (
                      <Badge color="gray">Inactive</Badge>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="mb-4 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <IconUsers className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{provider.contact_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 flex-shrink-0 text-center text-[10px] text-gray-400">☎</span>
                    <span>{provider.phone}</span>
                  </div>
                  {provider.email && (
                    <div className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 flex-shrink-0 text-center text-[10px] text-gray-400">✉</span>
                      <span className="truncate text-xs">{provider.email}</span>
                    </div>
                  )}
                </div>

                {/* Vehicle count + actions */}
                <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => vCount > 0 ? setDrawerProvider(provider) : undefined}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      vCount > 0
                        ? 'text-primary-600 hover:text-primary-800 cursor-pointer'
                        : 'text-gray-400 cursor-default'
                    }`}
                  >
                    <IconTruck className="h-3.5 w-3.5" />
                    {vCount} vehicle{vCount !== 1 ? 's' : ''} tagged
                    {vCount > 0 && <IconArrowRight className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(provider)}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    <IconEdit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vehicle drawer — slides in from the right when a provider's vehicle count is clicked */}
      {drawerProvider && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerProvider(null)} />

          {/* Panel */}
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex flex-shrink-0 items-start justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{drawerProvider.name}</h3>
                <p className="mt-0.5 text-xs text-gray-400">
                  {drawerVehicles.length} vehicle{drawerVehicles.length !== 1 ? 's' : ''} tagged · {drawerProvider.category} · {drawerProvider.city}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerProvider(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            {/* Vehicle list */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {drawerVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <IconTruck className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">No vehicles tagged</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Onboard a vehicle with <strong>{drawerProvider.category}</strong> ownership and select this provider.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {drawerVehicles.map(v => (
                    <div
                      key={v.vehicle_id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{v.registration_number}</p>
                        <p className="text-xs text-gray-400">
                          {v.make} {v.model} · {v.vehicle_type}
                        </p>
                        <p className="text-xs text-gray-400">
                          {v.ownership_type} · {v.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDrawerProvider(null);
                          navigate('/fleet/fleet', { state: { openVehicleId: v.vehicle_id } });
                        }}
                        className="ml-3 flex flex-shrink-0 items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800"
                        aria-label={`View ${v.registration_number}`}
                      >
                        View
                        <IconArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-100 px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setDrawerProvider(null);
                  navigate('/fleet/fleet');
                }}
                className="text-xs font-medium text-primary-600 hover:text-primary-800 hover:underline"
              >
                Go to Fleet Management →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProvider ? 'Edit Provider' : 'Add Marketplace Provider'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Provider Name" value={f.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Ola Corporate" />
            </div>
            <Select
              label="Category"
              options={CATEGORY_OPTIONS}
              value={f.category}
              onChange={e => set('category', e.target.value)}
              required
            />
            <Input label="City" value={f.city} onChange={e => set('city', e.target.value)} required placeholder="e.g. Mumbai" />
            <Input label="Contact Person" value={f.contact_name} onChange={e => set('contact_name', e.target.value)} required placeholder="Name" />
            <Input label="Phone" type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} required placeholder="+91 98..." />
            <div className="col-span-2">
              <Input label="Email (optional)" type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="contact@provider.com" />
            </div>
            {editingProvider && (
              <div className="col-span-2">
                <Select
                  label="Status"
                  options={[{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }]}
                  value={f.status}
                  onChange={e => set('status', e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingProvider ? 'Save Changes' : 'Add Provider'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
