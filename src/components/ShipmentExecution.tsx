import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Ship, 
  Package, 
  FileCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  MapPin,
  Anchor,
  Container,
  ClipboardList,
  RefreshCw,
  MoreVertical,
  Sparkles,
  Zap,
  AlertTriangle,
  ChevronRight,
  Download,
  CheckSquare,
  Square
} from 'lucide-react';
import { ExportOrder } from '../lib/types';
import { subscribeToCollection, updateDocument } from '../services/db';
import { formatDate } from '../lib/utils';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './Auth';
import { Timestamp } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SHIPMENT_STEPS = [
  { id: 'booking', label: 'Booking', icon: Calendar, description: 'Vessel/Truck booking confirmed' },
  { id: 'loading', label: 'Loading', icon: Container, description: 'Container stuffing and loading' },
  { id: 'customs', label: 'Customs', icon: FileCheck, description: 'Export clearance and documentation' },
  { id: 'transit', label: 'In Transit', icon: Ship, description: 'Shipment is on the way' },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle2, description: 'Reached destination port' },
];

export default function ShipmentExecution() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ExportOrder | null>(null);
  const [optimizing, setOptimizing] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.organization) return;

    const unsubscribe = subscribeToCollection<ExportOrder>(
      'orders', 
      (data) => {
        setOrders(data);
        setLoading(false);
      }, 
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    return () => unsubscribe();
  }, [profile]);

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.commodity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateShipmentStatus = async (orderId: string, status: string) => {
    try {
      await updateDocument('orders', orderId, { shipmentStatus: status });
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, shipmentStatus: status });
      }
    } catch (error) {
      console.error('Error updating shipment status:', error);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ExportOrder>>({});

  const handleEdit = (order: ExportOrder) => {
    setEditData({
      originPort: order.originPort || 'Cochin, India',
      destinationPort: order.destinationPort || 'Dubai, UAE',
      containerNumber: order.containerNumber || '',
      eta: order.eta || Timestamp.now()
    });
    setIsEditing(true);
  };

  const saveLogistics = async () => {
    if (!selectedOrder) return;
    try {
      await updateDocument('orders', selectedOrder.id, editData);
      setIsEditing(false);
      setSelectedOrder({ ...selectedOrder, ...editData });
    } catch (error) {
      console.error('Error saving logistics:', error);
    }
  };

  const optimizeLogistics = async (order: ExportOrder) => {
    setOptimizing(order.id);
    try {
      const model = 'gemini-3-flash-preview';
      const prompt = `Optimize logistics for this export order:
      Order: ${order.orderNumber}
      Commodity: ${order.commodity}
      Origin: ${order.originPort || 'Cochin, India'}
      Destination: ${order.destinationPort || 'Dubai, UAE'}
      Quantity: ${order.quantity} ${order.unit}
      
      Consider current global shipping delays, port congestion, and cost-effective routes for spices.
      Return a JSON object with: recommendedRoute (string), estimatedTransitDays (number), riskLevel ('low', 'medium', 'high'), and optimizationTips (array of strings).`;

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const optimization = JSON.parse(response.text || '{}');
      await updateDocument('orders', order.id, { logisticsAI: optimization });
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...selectedOrder, logisticsAI: optimization });
      }
    } catch (error) {
      console.error('Logistics optimization error:', error);
    } finally {
      setOptimizing(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Shipment Execution</h2>
          <p className="text-zinc-500 mt-1">Real-time tracking and execution of export logistics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-200 flex items-center justify-center text-[10px] font-bold">
                U{i}
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-zinc-400 ml-2">5 Active Operators</span>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Order #, Customer, or Commodity..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all">
          <Filter size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="animate-spin mx-auto text-zinc-400" size={32} />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-zinc-200">
              <p className="text-zinc-400 font-bold">No active shipments found</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className={clsx(
                  "bg-white rounded-3xl border transition-all group cursor-pointer overflow-hidden",
                  selectedOrder?.id === order.id ? "border-emerald-500 shadow-md" : "border-zinc-200 hover:border-emerald-500/50 shadow-sm"
                )}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600">
                        {order.transportMode === 'sea' ? <Ship size={20} /> : <Truck size={20} />}
                      </div>
                      <div>
                        <h3 className="font-black text-zinc-900 tracking-tight">#{order.orderNumber}</h3>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{order.commodity}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          optimizeLogistics(order);
                        }}
                        disabled={optimizing === order.id}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Optimize Logistics"
                      >
                        {optimizing === order.id ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      </button>
                      <div>
                        <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md text-[10px] font-black uppercase tracking-widest">
                          {order.shipmentStatus || 'Pending'}
                        </span>
                        <p className="text-[10px] text-zinc-400 font-bold mt-1">ETA: {order.eta ? formatDate(order.eta) : 'TBD'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Origin</p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                        <MapPin size={12} className="text-zinc-400" />
                        {order.originPort || 'Cochin, India'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Destination</p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                        <Anchor size={12} className="text-zinc-400" />
                        {order.destinationPort || 'Dubai, UAE'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Quantity</p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                        <Package size={12} className="text-zinc-400" />
                        {order.quantity} {order.unit}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Container</p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                        <Container size={12} className="text-zinc-400" />
                        {order.containerNumber || 'TBD'}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative pt-2">
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${(SHIPMENT_STEPS.findIndex(s => s.id === (order.shipmentStatus || 'booking')) + 1) / SHIPMENT_STEPS.length * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      {SHIPMENT_STEPS.map((step, idx) => (
                        <div key={step.id} className={clsx(
                          "text-[8px] font-black uppercase tracking-tighter",
                          SHIPMENT_STEPS.findIndex(s => s.id === (order.shipmentStatus || 'booking')) >= idx ? "text-emerald-600" : "text-zinc-300"
                        )}>
                          {step.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div 
                key={selectedOrder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden sticky top-6"
              >
                <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Execution Details</h3>
                    <button onClick={() => setSelectedOrder(null)} className="text-zinc-400 hover:text-zinc-600">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl border border-zinc-200 flex items-center justify-center text-zinc-900 font-black">
                      {selectedOrder.orderNumber.slice(-2)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900">#{selectedOrder.orderNumber}</p>
                      <p className="text-xs text-zinc-500 font-medium">{selectedOrder.customerName}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Logistics Details</h4>
                      <button 
                        onClick={() => handleEdit(selectedOrder)}
                        className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest"
                      >
                        Edit
                      </button>
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Origin Port</label>
                          <input 
                            type="text" 
                            value={editData.originPort}
                            onChange={(e) => setEditData({ ...editData, originPort: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Destination Port</label>
                          <input 
                            type="text" 
                            value={editData.destinationPort}
                            onChange={(e) => setEditData({ ...editData, destinationPort: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Container #</label>
                          <input 
                            type="text" 
                            value={editData.containerNumber}
                            onChange={(e) => setEditData({ ...editData, containerNumber: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={saveLogistics}
                            className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-2 bg-zinc-200 text-zinc-600 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Origin</p>
                          <p className="text-xs font-bold text-zinc-700">{selectedOrder.originPort || 'Cochin, India'}</p>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Destination</p>
                          <p className="text-xs font-bold text-zinc-700">{selectedOrder.destinationPort || 'Dubai, UAE'}</p>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Container</p>
                          <p className="text-xs font-bold text-zinc-700">{selectedOrder.containerNumber || 'TBD'}</p>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">ETA</p>
                          <p className="text-xs font-bold text-zinc-700">{selectedOrder.eta ? formatDate(selectedOrder.eta) : 'TBD'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Execution Roadmap</h4>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-100" />
                      <div className="space-y-8 relative">
                        {SHIPMENT_STEPS.map((step, idx) => {
                          const isCompleted = SHIPMENT_STEPS.findIndex(s => s.id === (selectedOrder.shipmentStatus || 'booking')) >= idx;
                          const isCurrent = (selectedOrder.shipmentStatus || 'booking') === step.id;
                          
                          return (
                            <div key={step.id} className="flex items-start gap-4">
                              <div className={clsx(
                                "w-8 h-8 rounded-xl flex items-center justify-center relative z-10 transition-all",
                                isCompleted ? "bg-emerald-500 text-white" : "bg-white border-2 border-zinc-100 text-zinc-300"
                              )}>
                                <step.icon size={16} />
                              </div>
                              <div className="flex-1 pt-1">
                                <div className="flex items-center justify-between">
                                  <p className={clsx(
                                    "text-xs font-black uppercase tracking-widest",
                                    isCompleted ? "text-zinc-900" : "text-zinc-400"
                                  )}>
                                    {step.label}
                                  </p>
                                  {isCurrent && step.id !== 'delivered' && (
                                    <button 
                                      onClick={() => updateShipmentStatus(selectedOrder.id, SHIPMENT_STEPS[idx + 1].id)}
                                      className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest"
                                    >
                                      Complete
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                                  {step.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Logistics Documents</h4>
                    <div className="space-y-2">
                      {['Bill of Lading', 'Packing List', 'Certificate of Origin'].map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 group hover:border-emerald-500/30 transition-all">
                          <div className="flex items-center gap-3">
                            <FileCheck size={16} className="text-zinc-400 group-hover:text-emerald-500" />
                            <span className="text-xs font-bold text-zinc-700">{doc}</span>
                          </div>
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="w-full py-3 bg-zinc-900 text-white rounded-2xl text-sm font-black hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                    <ClipboardList size={18} />
                    Generate Shipment Report
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 p-12 text-center sticky top-6">
                <div className="w-16 h-16 bg-white rounded-2xl border border-zinc-100 flex items-center justify-center text-zinc-300 mx-auto mb-4">
                  <ArrowRight size={32} />
                </div>
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Select an order to view execution details</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
