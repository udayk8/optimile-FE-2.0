import React, { useState } from 'react';
import { TyreIndent, IndentStatus, IndentPriority, UserRole } from '../types';
import {
  FileText, CheckCircle, XCircle, Clock, Package, TrendingUp,
  Search, Filter, Eye, ThumbsUp, ThumbsDown, Truck, CheckCheck
} from 'lucide-react';

interface IndentDashboardProps {
  indents: TyreIndent[];
  onApprove: (id: string, approver: string) => void;
  onReject: (id: string, reason: string) => void;
  onMarkOrdered: (id: string, poNumber: string, vendorId: string) => void;
  onMarkReceived: (id: string) => void;
  currentUser: { name: string; role: UserRole };
}

export const IndentDashboard: React.FC<IndentDashboardProps> = ({
  indents,
  onApprove,
  onReject,
  onMarkOrdered,
  onMarkReceived,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<IndentStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<IndentPriority | 'All'>('All');
  const [selectedIndent, setSelectedIndent] = useState<TyreIndent | null>(null);

  // Filter indents
  const filteredIndents = indents.filter(indent => {
    const matchesSearch =
      indent.indentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      indent.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      indent.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || indent.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || indent.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate stats
  const stats = {
    total: indents.length,
    pending: indents.filter(i => i.status === 'Pending').length,
    approved: indents.filter(i => i.status === 'Approved').length,
    totalValue: indents.reduce((sum, i) => sum + i.totalEstimatedCost, 0)
  };

  const canApprove = currentUser.role === UserRole.FLEET_ADMIN || currentUser.role === UserRole.SUPERVISOR;

  const getStatusBadge = (status: IndentStatus) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      Approved: 'bg-green-100 text-green-700 border-green-300',
      Rejected: 'bg-red-100 text-red-700 border-red-300',
      Ordered: 'bg-blue-100 text-blue-700 border-blue-300',
      Received: 'bg-purple-100 text-purple-700 border-purple-300'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: IndentPriority) => {
    const styles = {
      Normal: 'bg-blue-50 text-blue-600',
      Urgent: 'bg-orange-50 text-orange-600',
      Critical: 'bg-red-50 text-red-600'
    };

    return (
      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  const handleAction = (action: 'approve' | 'reject' | 'order' | 'receive', indent: TyreIndent) => {
    switch (action) {
      case 'approve':
        if (window.confirm(`Approve indent ${indent.indentNumber}?`)) {
          onApprove(indent.id, currentUser.name);
        }
        break;
      case 'reject':
        const reason = window.prompt('Enter rejection reason:');
        if (reason) {
          onReject(indent.id, reason);
        }
        break;
      case 'order':
        const poNumber = window.prompt('Enter PO Number:');
        const vendorId = window.prompt('Enter Vendor ID:');
        if (poNumber && vendorId) {
          onMarkOrdered(indent.id, poNumber, vendorId);
        }
        break;
      case 'receive':
        if (window.confirm(`Mark indent ${indent.indentNumber} as received? This will trigger GRN workflow.`)) {
          onMarkReceived(indent.id);
        }
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
            Tyre Stock Indents
          </h1>
          <p className="text-sm text-slate-500 mt-1">Purchase Requisition Management</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Indents</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Pending Approval</p>
              <p className="text-3xl font-black text-orange-600 mt-2">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Approved</p>
              <p className="text-3xl font-black text-green-600 mt-2">{stats.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Total Value</p>
              <p className="text-2xl font-black text-purple-600 mt-2">
                ₹{(stats.totalValue / 100000).toFixed(1)}L
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by indent number, requester, or location..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 ring-purple-500/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as IndentStatus | 'All')}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-purple-500/20"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Ordered">Ordered</option>
            <option value="Received">Received</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as IndentPriority | 'All')}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-purple-500/20"
          >
            <option value="All">All Priority</option>
            <option value="Normal">Normal</option>
            <option value="Urgent">Urgent</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Indents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Indent No.
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Items
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Est. Cost
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Requested By
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIndents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">
                    No indents found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredIndents.map(indent => (
                  <tr key={indent.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-slate-700">{indent.indentNumber}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(indent.requestDate).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {indent.location}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-700">
                        {indent.items.reduce((sum, item) => sum + item.quantity, 0)} tyres
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {indent.items.length} item(s)
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getPriorityBadge(indent.priority)}
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-slate-700">
                      ₹{indent.totalEstimatedCost.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(indent.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600">{indent.requestedBy}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase">
                        {indent.requestedByRole.replace('_', ' ')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedIndent(indent)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 text-slate-600" />
                        </button>

                        {indent.status === 'Pending' && canApprove && (
                          <>
                            <button
                              onClick={() => handleAction('approve', indent)}
                              className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <ThumbsUp className="h-4 w-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleAction('reject', indent)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <ThumbsDown className="h-4 w-4 text-red-600" />
                            </button>
                          </>
                        )}

                        {indent.status === 'Approved' && canApprove && (
                          <button
                            onClick={() => handleAction('order', indent)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Mark as Ordered"
                          >
                            <Truck className="h-4 w-4 text-blue-600" />
                          </button>
                        )}

                        {indent.status === 'Ordered' && canApprove && (
                          <button
                            onClick={() => handleAction('receive', indent)}
                            className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Mark as Received"
                          >
                            <CheckCheck className="h-4 w-4 text-purple-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedIndent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase">{selectedIndent.indentNumber}</h3>
                <p className="text-purple-200 text-xs mt-1">{selectedIndent.location}</p>
              </div>
              <button
                onClick={() => setSelectedIndent(null)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested By</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{selectedIndent.requestedBy}</p>
                  <p className="text-xs text-slate-500 uppercase">{selectedIndent.requestedByRole.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Request Date</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {new Date(selectedIndent.requestDate).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</p>
                  <div className="mt-2">{getPriorityBadge(selectedIndent.priority)}</div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                  <div className="mt-2">{getStatusBadge(selectedIndent.status)}</div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Items Requested</p>
                <div className="space-y-2">
                  {selectedIndent.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-slate-700">
                          {item.brand} {item.model} - {item.size}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Quantity: {item.quantity} | Unit Cost: ₹{item.estimatedCost.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <p className="text-sm font-black text-slate-700">
                        ₹{(item.quantity * item.estimatedCost).toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Justification</p>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4">
                  {selectedIndent.justification}
                </p>
              </div>

              {selectedIndent.approver && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <p className="text-xs font-bold text-green-700">
                    Approved by {selectedIndent.approver} on{' '}
                    {new Date(selectedIndent.approvalDate!).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedIndent.rejectionReason && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <p className="text-xs font-bold text-red-700">
                    Rejection Reason: {selectedIndent.rejectionReason}
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                <p className="text-xs font-black text-purple-600 uppercase tracking-widest">Total Estimated Cost</p>
                <p className="text-2xl font-black text-purple-700 mt-1">
                  ₹{selectedIndent.totalEstimatedCost.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
