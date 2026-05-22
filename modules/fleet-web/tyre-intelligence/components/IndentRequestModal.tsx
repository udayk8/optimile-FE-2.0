import React, { useState } from 'react';
import { Location, TyreIndent, TyreIndentItem, IndentPriority, UserRole } from '../types';
import { X, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

interface IndentRequestModalProps {
  onClose: () => void;
  onSubmit: (indent: Omit<TyreIndent, 'id' | 'indentNumber' | 'status'>) => void;
  locations: Location[];
  currentUser: { name: string; role: UserRole };
}

export const IndentRequestModal: React.FC<IndentRequestModalProps> = ({
  onClose,
  onSubmit,
  locations,
  currentUser
}) => {
  const [location, setLocation] = useState(locations[0]?.id || '');
  const [priority, setPriority] = useState<IndentPriority>('Normal');
  const [justification, setJustification] = useState('');
  const [items, setItems] = useState<TyreIndentItem[]>([
    { brand: 'Bridgestone', model: 'M840', size: '295/80 R22.5', quantity: 1, estimatedCost: 15000 }
  ]);

  const addItem = () => {
    setItems([...items, { brand: '', model: '', size: '', quantity: 1, estimatedCost: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof TyreIndentItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const calculateTotalCost = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.estimatedCost), 0);
  };

  const handleSubmit = () => {
    if (!justification.trim() || items.some(item => !item.brand || !item.model || !item.size || item.quantity < 1)) {
      alert('Please fill all required fields');
      return;
    }

    const locationName = locations.find(l => l.id === location)?.name || '';

    onSubmit({
      requestedBy: currentUser.name,
      requestedByRole: currentUser.role,
      requestDate: new Date().toISOString(),
      location: locationName,
      items,
      priority,
      justification,
      totalEstimatedCost: calculateTotalCost()
    });

    onClose();
  };

  const priorityColors = {
    Normal: 'bg-blue-50 text-blue-700 border-blue-200',
    Urgent: 'bg-orange-50 text-orange-700 border-orange-200',
    Critical: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-in fade-in duration-200">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-purple-600 px-10 py-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Tyre Stock Indent Request</h2>
            <p className="text-purple-200 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
              Purchase Requisition
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold hover:bg-white/20 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Requested By
              </label>
              <input
                type="text"
                value={currentUser.name}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Location *
              </label>
              <select
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 ring-purple-500/10"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Priority Level *
            </label>
            <div className="flex gap-3">
              {(['Normal', 'Urgent', 'Critical'] as IndentPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                    priority === p ? priorityColors[p] : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {p === 'Critical' && <AlertTriangle className="h-3 w-3 inline mr-2" />}
                  {p === 'Normal' && <CheckCircle className="h-3 w-3 inline mr-2" />}
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Tyre Items *
              </label>
              <button
                onClick={addItem}
                className="text-xs font-black uppercase tracking-widest text-purple-600 hover:text-purple-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="bg-slate-50 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-500 uppercase">Item {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Brand *
                      </label>
                      <input
                        type="text"
                        value={item.brand}
                        onChange={e => updateItem(index, 'brand', e.target.value)}
                        placeholder="e.g., Bridgestone"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-purple-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Model *
                      </label>
                      <input
                        type="text"
                        value={item.model}
                        onChange={e => updateItem(index, 'model', e.target.value)}
                        placeholder="e.g., M840"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-purple-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Size *
                      </label>
                      <input
                        type="text"
                        value={item.size}
                        onChange={e => updateItem(index, 'size', e.target.value)}
                        placeholder="e.g., 295/80 R22.5"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-purple-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-purple-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Est. Cost/Unit (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.estimatedCost}
                        onChange={e => updateItem(index, 'estimatedCost', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-purple-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Total Amount
                      </label>
                      <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700">
                        ₹{(item.quantity * item.estimatedCost).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Justification / Reason *
            </label>
            <textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="Explain the need for this stock requisition..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium outline-none focus:ring-4 ring-purple-500/10 resize-none"
            />
          </div>

          {/* Total Cost Summary */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border-2 border-purple-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                  Total Estimated Cost
                </p>
                <p className="text-xs text-purple-500 mt-1">
                  {items.reduce((sum, item) => sum + item.quantity, 0)} tyres across {items.length} item(s)
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-purple-700">
                  ₹{calculateTotalCost().toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-10 py-6 flex justify-end gap-4 bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/30 transition-all active:scale-95"
          >
            Submit Indent Request
          </button>
        </div>
      </div>
    </div>
  );
};
