import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Globe, 
  Users, 
  Ship, 
  Download,
  Calendar,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { subscribeToCollection } from '../services/db';
import { ExportOrder, Company } from '../lib/types.ts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

export default function ReportList() {
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubOrders = subscribeToCollection<ExportOrder>('orders', (data) => {
      setOrders(data);
    });

    const unsubCompanies = subscribeToCollection<Company>('companies', (data) => {
      setCompanies(data);
    });

    setLoading(false);

    return () => {
      unsubOrders();
      unsubCompanies();
    };
  }, []);

  // Calculate Market Distribution
  const marketDistribution = orders.reduce((acc: any[], order) => {
    const market = order.destinationCountry || 'Unknown';
    const existing = acc.find(item => item.name === market);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: market, value: 1 });
    }
    return acc;
  }, []);

  // Calculate Top Products
  const productDistribution = orders.reduce((acc: any[], order) => {
    (order.items || []).forEach(item => {
      const existing = acc.find(p => p.name === item.productName);
      if (existing) {
        existing.totalValue += item.totalPrice;
        existing.totalQuantity += item.quantity;
      } else {
        acc.push({ 
          name: item.productName, 
          totalValue: item.totalPrice, 
          totalQuantity: item.quantity 
        });
      }
    });
    return acc;
  }, []).sort((a, b) => b.totalValue - a.totalValue);

  const totalOrderValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const avgOrderValue = orders.length > 0 ? totalOrderValue / orders.length : 0;
  
  const onTimeShipments = orders.filter(o => o.status === 'shipped' || o.status === 'delivered').length;
  const shipmentRate = orders.length > 0 ? (onTimeShipments / orders.length) * 100 : 0;

  const customerCount = companies.filter(c => c.type === 'customer').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Reports & Analytics</h2>
          <p className="text-zinc-500 mt-1">Business intelligence and export performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            <Calendar size={18} />
            All Time
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
            <Download size={18} />
            Export Data
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 mb-6">Market Distribution (by Orders)</h3>
          <div className="w-full h-[400px]">
            {marketDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={marketDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={140}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {marketDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7'}}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-400">
                No market data available
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Live</span>
            </div>
            <p className="text-sm font-medium text-zinc-500">Average Order Value</p>
            <h4 className="text-2xl font-bold text-zinc-900 mt-1">
              ${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users size={20} />
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{customerCount}</span>
            </div>
            <p className="text-sm font-medium text-zinc-500">Total Customers</p>
            <h4 className="text-2xl font-bold text-zinc-900 mt-1">{customerCount} Active</h4>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Ship size={20} />
              </div>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                {shipmentRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm font-medium text-zinc-500">Shipment Fulfillment</p>
            <h4 className="text-2xl font-bold text-zinc-900 mt-1">{onTimeShipments} Shipped</h4>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <h3 className="text-lg font-bold text-zinc-900 mb-6">Top Export Products (by Value)</h3>
        <div className="space-y-4">
          {productDistribution.length > 0 ? (
            productDistribution.slice(0, 5).map((product, i) => {
              const share = (product.totalValue / totalOrderValue) * 100;
              return (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-zinc-900">{product.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500">${product.totalValue.toLocaleString()}</span>
                      <span className="text-emerald-600 font-bold">{share.toFixed(1)}% share</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${COLORS[i % COLORS.length]} transition-all duration-1000`} 
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-zinc-400">
              No product data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
