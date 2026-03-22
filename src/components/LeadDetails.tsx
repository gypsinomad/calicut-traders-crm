import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  Clock, 
  MessageSquare, 
  FileText,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  User,
  Building2,
  Tag,
  RefreshCw,
  Edit2,
  ArrowRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, ExportOrder } from '../lib/types.ts';
import { getStatusColor, formatDate } from '../lib/utils';
import { updateDocument, createDocument } from '../services/db';
import { useAuth } from './Auth';
import { useNavigate } from 'react-router-dom';
import { serverTimestamp, Timestamp } from 'firebase/firestore';

interface LeadDetailsProps {
  lead: Lead;
  onBack: () => void;
}

export default function LeadDetails({ lead, onBack }: LeadDetailsProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedLead, setEditedLead] = useState<Lead>(lead);

  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDocument('leads', lead.id, editedLead);
      setShowEditModal(false);
      alert('Lead updated successfully!');
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };

  const handleConvertToOrder = async () => {
    if (!profile?.organization) return;

    try {
      const orderData: Partial<ExportOrder> = {
        orderNumber: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
        customerName: lead.fullName,
        customerPhone: lead.phone,
        title: `Order from Lead: ${lead.companyName}`,
        commodity: lead.productInterest,
        quantity: 0,
        unit: 'kg',
        stage: 'orderConfirmed',
        status: 'Confirmed',
        totalAmount: 0,
        totalValue: 0,
        destination: lead.destinationCountry,
        destinationCountry: lead.destinationCountry,
        createdAt: serverTimestamp() as any,
        assignedUserId: profile.uid,
        companyId: '', // Should ideally link to a company entity
        currency: 'USD',
        items: [],
        documents: [],
        docsCompleted: 0,
        docsTotal: 5,
        organization: profile.organization,
      };

      await createDocument('orders', orderData);
      await updateDocument('leads', lead.id, { status: 'converted' });
      alert('Lead converted to order successfully!');
      navigate('/orders');
    } catch (error) {
      console.error("Error converting lead to order:", error);
    }
  };

  const handleStatusChange = async (newStatus: Lead['status']) => {
    setUpdating(true);
    try {
      await updateDocument('leads', lead.id, { status: newStatus });
    } catch (error) {
      console.error('Error updating lead status:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-zinc-900">{lead.fullName}</h2>
              <div className="relative group">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
                  {['new', 'contacted', 'qualified', 'quoted', 'converted', 'lost'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status as Lead['status'])}
                      disabled={updating}
                      className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors flex items-center justify-between"
                    >
                      {status}
                      {updating && status === lead.status && <RefreshCw size={12} className="animate-spin" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-zinc-500 mt-1 flex items-center gap-2">
              <Building2 size={14} />
              {lead.companyName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Edit Lead
          </button>
          <button 
            onClick={handleConvertToOrder}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Convert to Order
          </button>
        </div>
      </header>

      {/* Edit Lead Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleEditLead} className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-zinc-900">Edit Lead</h3>
                  <button onClick={() => setShowEditModal(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editedLead.fullName}
                      onChange={(e) => setEditedLead({ ...editedLead, fullName: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Company Name</label>
                    <input
                      type="text"
                      value={editedLead.companyName}
                      onChange={(e) => setEditedLead({ ...editedLead, companyName: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                      <input
                        type="email"
                        value={editedLead.email}
                        onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Phone</label>
                      <input
                        type="text"
                        value={editedLead.phone}
                        onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Priority</label>
                      <select
                        value={editedLead.priority}
                        onChange={(e) => setEditedLead({ ...editedLead, priority: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      >
                        <option value="cold">Cold</option>
                        <option value="warm">Warm</option>
                        <option value="hot">Hot</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Incoterms</label>
                      <select
                        value={editedLead.incotermsPreference}
                        onChange={(e) => setEditedLead({ ...editedLead, incotermsPreference: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      >
                        <option value="FOB">FOB</option>
                        <option value="CIF">CIF</option>
                        <option value="EXW">EXW</option>
                        <option value="CNF">CNF</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                      <select
                        value={editedLead.status}
                        onChange={(e) => setEditedLead({ ...editedLead, status: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="quoted">Quoted</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Next Follow-up</label>
                      <input
                        type="date"
                        value={editedLead.nextFollowUpAt?.toDate?.() ? editedLead.nextFollowUpAt.toDate().toISOString().split('T')[0] : ''}
                        onChange={(e) => setEditedLead({ 
                          ...editedLead, 
                          nextFollowUpAt: e.target.value ? Timestamp.fromDate(new Date(e.target.value)) : undefined 
                        })}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</p>
                <div className="flex items-center gap-2 text-zinc-900">
                  <Mail size={16} className="text-zinc-400" />
                  <a href={`mailto:${lead.email}`} className="text-sm font-medium hover:text-emerald-600 transition-colors">{lead.email}</a>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Phone Number</p>
                <div className="flex items-center gap-2 text-zinc-900">
                  <Phone size={16} className="text-zinc-400" />
                  <a href={`tel:${lead.phone}`} className="text-sm font-medium hover:text-emerald-600 transition-colors">{lead.phone}</a>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Market / Destination</p>
                <div className="flex items-center gap-2 text-zinc-900">
                  <Globe size={16} className="text-zinc-400" />
                  <span className="text-sm font-medium">{lead.destinationCountry}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Lead Source</p>
                <div className="flex items-center gap-2 text-zinc-900">
                  <MessageSquare size={16} className="text-zinc-400" />
                  <span className="text-sm font-medium capitalize">{lead.source}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Product Interest</h3>
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-sm text-zinc-900 leading-relaxed">{lead.productInterest}</p>
            </div>
            <div className="mt-6 flex items-center gap-8">
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Preferred Incoterms</p>
                <span className="text-sm font-bold text-zinc-900">{lead.incotermsPreference || 'Not specified'}</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Priority Level</p>
                <span className={`text-sm font-bold uppercase tracking-wider ${
                  lead.priority === 'hot' ? 'text-rose-500' :
                  lead.priority === 'warm' ? 'text-amber-500' :
                  'text-zinc-400'
                }`}>
                  {lead.priority || 'Normal'}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Created Date</p>
                <span className="text-sm font-bold text-zinc-900">{lead.createdAt?.toDate?.() ? formatDate(lead.createdAt) : 'N/A'}</span>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Activity Timeline</h3>
            <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
              {[
                { title: 'Quotation Sent', desc: 'Sent Proforma Invoice for 5MT Black Pepper', time: '2 days ago', icon: FileText, color: 'bg-blue-500' },
                { title: 'Lead Qualified', desc: 'Verified company registration and IEC', time: '5 days ago', icon: CheckCircle2, color: 'bg-emerald-500' },
                { title: 'Initial Contact', desc: 'Inquiry received via website form', time: '1 week ago', icon: Mail, color: 'bg-zinc-400' },
              ].map((event, i) => (
                <div key={i} className="relative pl-10">
                  <div className={`absolute left-0 top-1 w-8 h-8 rounded-full ${event.color} border-4 border-white flex items-center justify-center text-white shadow-sm`}>
                    <event.icon size={14} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">{event.title}</h4>
                    <p className="text-sm text-zinc-500 mt-0.5">{event.desc}</p>
                    <span className="text-xs text-zinc-400 mt-1 block">{event.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-4">Assigned Manager</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold border border-zinc-200">
                AV
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">Akhil Venugopal</p>
                <p className="text-xs text-zinc-500">Owner / Admin</p>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-4">Next Action</h3>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Follow up required</p>
                  <p className="text-xs text-amber-700 mt-1">
                    {lead.nextFollowUpAt 
                      ? `Scheduled follow-up for ${lead.fullName} regarding ${lead.productInterest}.`
                      : 'No follow-up scheduled yet. Set a date to stay on top of this lead.'}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-amber-600">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Due: {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : 'TBD'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-zinc-400">Export Potential</h3>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold">$12,500</p>
                <p className="text-xs text-zinc-400 mt-1">Estimated Deal Value</p>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-zinc-400">Confidence Score</span>
                  <span className="font-bold">85%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[85%]" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
