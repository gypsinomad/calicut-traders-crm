import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'motion/react';
import { 
  Ship, 
  Package, 
  FileCheck, 
  Truck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  ArrowRight
} from 'lucide-react';
import { ExportOrder, OrderStage } from '../lib/types';
import { subscribeToCollection, updateDocument } from '../services/db';
import { clsx } from 'clsx';
import { useAuth } from './Auth';

const STAGES: { id: OrderStage; label: string; icon: any; color: string }[] = [
  { id: 'orderConfirmed', label: 'Confirmed', icon: CheckCircle2, color: 'bg-emerald-500' },
  { id: 'exportDocumentation', label: 'Docs', icon: FileCheck, color: 'bg-blue-500' },
  { id: 'shipmentReady', label: 'Packing', icon: Package, color: 'bg-amber-500' },
  { id: 'shippedDelivered', label: 'Shipping', icon: Ship, color: 'bg-indigo-500' },
];

import { WhatsAppService } from '../services/whatsapp';

export default function ShipmentKanban() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [loading, setLoading] = useState(true);

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

  const moveOrder = async (orderId: string, newStage: OrderStage) => {
    try {
      await updateDocument('orders', orderId, { stage: newStage });
      
      const order = orders.find(o => o.id === orderId);
      if (order) {
        if (newStage === 'orderConfirmed') {
          await WhatsAppService.sendOrderConfirmation(order);
        } else if (newStage === 'shippedDelivered') {
          // For demo, we'll use a fixed ETA or calculate one
          const eta = order.eta ? new Date(order.eta.toDate()).toLocaleDateString() : '15-Apr-2026';
          await WhatsAppService.sendShipmentUpdate(order, eta);
        }
      }
    } catch (error) {
      console.error('Failed to move order:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[600px]">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-zinc-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Shipment Pipeline</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Track and manage your export orders through the pipeline</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 overflow-x-auto pb-4 min-h-[600px]">
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex flex-col gap-4 min-w-[280px]">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={clsx("p-1.5 rounded-lg text-white", stage.color)}>
                  <stage.icon size={16} />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm uppercase tracking-wider">
                  {stage.label}
                </h3>
                <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {orders.filter(o => o.stage === stage.id).length}
                </span>
              </div>
              <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-3 border border-zinc-200 dark:border-zinc-800 space-y-3">
              {orders
                .filter(o => o.stage === stage.id)
                .map((order) => (
                  <motion.div
                    key={order.id}
                    layoutId={order.id}
                    className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                        #{order.orderNumber}
                      </span>
                      {order.riskScore && order.riskScore > 70 && (
                        <AlertCircle size={14} className="text-rose-500" />
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">{order.commodity}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{order.customerName}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-700">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 uppercase">Value</span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          {order.currency} {order.totalValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {STAGES.findIndex(s => s.id === stage.id) < STAGES.length - 1 && (
                          <button 
                            onClick={() => moveOrder(order.id, STAGES[STAGES.findIndex(s => s.id === stage.id) + 1].id)}
                            className="p-1.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              
              {orders.filter(o => o.stage === stage.id).length === 0 && (
                <div className="h-24 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold">Empty</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
