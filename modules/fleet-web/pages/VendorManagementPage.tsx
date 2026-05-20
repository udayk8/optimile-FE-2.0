import React, { useState, useEffect } from 'react';
import { Vendor, VendorLedgerSummary, VendorInvoice, VendorPayment, PaymentMode, InvoiceStatus } from '../types';
import { VendorAPI, InvoiceAPI, PaymentAPI } from '../services/mockDatabase1';
import { Button, Input, Select, Badge, Modal } from '../components/UI';
import { IconUsers, IconPlus, IconSearch, IconArrowRight, IconCircleDollar, IconFile, IconCheck, IconClock, IconAlert } from '../components/Icons';

export const VendorManagementPage: React.FC = () => {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Detail View State
    const [ledger, setLedger] = useState<VendorLedgerSummary | null>(null);
    const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
    const [payments, setPayments] = useState<VendorPayment[]>([]);
    const [detailTab, setDetailTab] = useState<'outstanding' | 'history'>('outstanding');

    // Create Vendor Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newVendor, setNewVendor] = useState({
        vendor_name: '',
        gstin: '',
        address: '',
        service_categories: 'Parts'
    });

    // Record Payment Modal
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        invoice_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: PaymentMode.NEFT,
        paid_amount: '',
        reference_number: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        setIsLoading(true);
        const v = await VendorAPI.getAll();
        setVendors(v);
        setIsLoading(false);
    };

    const handleSelectVendor = async (vendorId: string) => {
        setSelectedVendorId(vendorId);
        setView('detail');
        setIsLoading(true);
        try {
            const [l, i, p] = await Promise.all([
                VendorAPI.getLedger(vendorId),
                InvoiceAPI.getByVendor(vendorId),
                PaymentAPI.getPaymentsByVendor(vendorId)
            ]);
            setLedger(l);
            setInvoices(i);
            setPayments(p);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await VendorAPI.create({
                ...newVendor,
                service_categories: newVendor.service_categories.split(',').map(s => s.trim())
            });
            setIsCreateModalOpen(false);
            loadVendors();
        } catch (error) {
            alert("Failed to create vendor");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openPaymentModal = (invoiceId?: string, outstanding?: number) => {
        setPaymentForm({
            invoice_id: invoiceId || '',
            payment_date: new Date().toISOString().split('T')[0],
            payment_mode: PaymentMode.NEFT,
            paid_amount: outstanding ? outstanding.toString() : '',
            reference_number: ''
        });
        setIsPaymentModalOpen(true);
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVendorId) return;
        setIsSubmitting(true);
        try {
            await PaymentAPI.recordPayment({
                vendor_id: selectedVendorId,
                invoice_id: paymentForm.invoice_id,
                payment_date: paymentForm.payment_date,
                payment_mode: paymentForm.payment_mode,
                paid_amount: parseFloat(paymentForm.paid_amount),
                reference_number: paymentForm.reference_number
            });
            setIsPaymentModalOpen(false);
            handleSelectVendor(selectedVendorId); // Refresh data
        } catch (error) {
            alert("Failed to record payment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredVendors = vendors.filter(v => v.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const selectedVendor = vendors.find(v => v.vendor_id === selectedVendorId);

    if (view === 'list') {
        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <IconPlus className="w-5 h-5 mr-2" />
                        Add Vendor
                    </Button>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconSearch className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            placeholder="Search vendors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSTIN</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categories</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredVendors.map(vendor => (
                                <tr key={vendor.vendor_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{vendor.vendor_name}</div>
                                        <div className="text-xs text-gray-500">{vendor.address}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{vendor.gstin}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {vendor.service_categories.map(c => (
                                                <span key={c} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color={vendor.status === 'Active' ? 'green' : 'red'}>{vendor.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleSelectVendor(vendor.vendor_id)}
                                            className="text-primary-600 hover:text-primary-900 font-medium text-sm flex items-center justify-end"
                                        >
                                            View Ledger
                                            <IconArrowRight className="w-4 h-4 ml-1" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Onboard Vendor">
                    <form onSubmit={handleCreateVendor}>
                        <Input 
                            label="Vendor Name" 
                            value={newVendor.vendor_name} 
                            onChange={e => setNewVendor({...newVendor, vendor_name: e.target.value})} 
                            required 
                        />
                        <Input 
                            label="GSTIN" 
                            value={newVendor.gstin} 
                            onChange={e => setNewVendor({...newVendor, gstin: e.target.value})} 
                            required 
                        />
                        <Input 
                            label="Address" 
                            value={newVendor.address} 
                            onChange={e => setNewVendor({...newVendor, address: e.target.value})} 
                            required 
                        />
                        <Input 
                            label="Categories (comma separated)" 
                            value={newVendor.service_categories} 
                            onChange={e => setNewVendor({...newVendor, service_categories: e.target.value})} 
                            placeholder="Parts, Labour, Tyres"
                        />
                        <div className="mt-6 flex justify-end space-x-3">
                            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button type="submit" isLoading={isSubmitting}>Create Vendor</Button>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    }

    if (!selectedVendor) return <div>Vendor not found</div>;

    const outstandingInvoices = invoices.filter(i => i.status !== InvoiceStatus.PAID && i.status !== InvoiceStatus.REJECTED && i.status !== InvoiceStatus.SUBMITTED);

    return (
        <div>
            <div className="flex items-center mb-6">
                <button onClick={() => setView('list')} className="mr-4 text-gray-500 hover:text-gray-700">
                    <IconArrowRight className="w-6 h-6 transform rotate-180" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedVendor.vendor_name}</h1>
                    <p className="text-sm text-gray-500">GSTIN: {selectedVendor.gstin} • {selectedVendor.address}</p>
                </div>
            </div>

            {/* Ledger Stats */}
            {ledger && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Outstanding</div>
                        <div className="text-2xl font-bold text-red-600">₹{ledger.outstanding_amount.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Paid</div>
                        <div className="text-2xl font-bold text-green-600">₹{ledger.total_paid.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Invoiced</div>
                        <div className="text-2xl font-bold text-gray-900">₹{ledger.total_invoiced.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Aging Analysis</div>
                        <div className="flex text-xs space-x-2">
                            <div className="flex-1 bg-green-50 p-1 rounded text-center">
                                <div className="font-bold text-green-700">0-30</div>
                                <div>₹{ledger.aging['0-30'].toLocaleString()}</div>
                            </div>
                            <div className="flex-1 bg-yellow-50 p-1 rounded text-center">
                                <div className="font-bold text-yellow-700">31-60</div>
                                <div>₹{ledger.aging['31-60'].toLocaleString()}</div>
                            </div>
                            <div className="flex-1 bg-red-50 p-1 rounded text-center">
                                <div className="font-bold text-red-700">60+</div>
                                <div>₹{ledger.aging['60+'].toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button 
                        onClick={() => setDetailTab('outstanding')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm ${detailTab === 'outstanding' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Outstanding Invoices
                    </button>
                    <button 
                        onClick={() => setDetailTab('history')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm ${detailTab === 'history' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Payment History
                    </button>
                </nav>
            </div>

            {detailTab === 'outstanding' && (
                <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Order</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {outstandingInvoices.map(inv => (
                                <tr key={inv.invoice_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 text-xs font-mono">{inv.work_order_id.substring(0, 8)}...</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">₹{inv.total_amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-red-600">₹{inv.balance_amount?.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <Badge color="yellow">{inv.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button size="sm" onClick={() => openPaymentModal(inv.invoice_id, inv.balance_amount)}>
                                            Pay
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {outstandingInvoices.length === 0 && (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No outstanding invoices.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {detailTab === 'history' && (
                <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Ref</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {payments.map(pay => {
                                const inv = invoices.find(i => i.invoice_id === pay.invoice_id);
                                return (
                                    <tr key={pay.payment_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">{new Date(pay.payment_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{pay.reference_number}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{pay.payment_mode}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-green-600">₹{pay.paid_amount.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {inv ? inv.invoice_number : 'Unknown'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {payments.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No payment history found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Vendor Payment">
                <form onSubmit={handleRecordPayment}>
                    <div className="bg-blue-50 p-3 rounded mb-4 text-sm text-blue-800 flex items-start">
                        <IconCircleDollar className="w-4 h-4 mr-2 mt-0.5" />
                        <div>
                            Payment will be recorded in the ledger and the invoice balance will be updated. 
                            This does not initiate a bank transfer.
                        </div>
                    </div>

                    <Select 
                        label="Invoice" 
                        options={outstandingInvoices.map(i => ({ label: `${i.invoice_number} (Bal: ₹${i.balance_amount})`, value: i.invoice_id }))}
                        value={paymentForm.invoice_id}
                        onChange={e => {
                            const inv = outstandingInvoices.find(i => i.invoice_id === e.target.value);
                            setPaymentForm({
                                ...paymentForm, 
                                invoice_id: e.target.value,
                                paid_amount: inv ? (inv.balance_amount || 0).toString() : ''
                            });
                        }}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Payment Date" 
                            type="date"
                            value={paymentForm.payment_date}
                            onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                            required
                        />
                        <Select 
                            label="Mode"
                            options={Object.values(PaymentMode).map(m => ({ label: m, value: m }))}
                            value={paymentForm.payment_mode}
                            onChange={e => setPaymentForm({...paymentForm, payment_mode: e.target.value as PaymentMode})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Amount (₹)" 
                            type="number"
                            value={paymentForm.paid_amount}
                            onChange={e => setPaymentForm({...paymentForm, paid_amount: e.target.value})}
                            required
                        />
                        <Input 
                            label="Reference No (UTR/Cheque)" 
                            value={paymentForm.reference_number}
                            onChange={e => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                            required
                        />
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Confirm Payment</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
