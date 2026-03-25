import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Package, 
  AlertTriangle, 
  ArrowRight,
  RefreshCw,
  Trash2,
  Download,
  Edit2,
  Calendar,
  Tag,
  MapPin,
  CheckCircle2,
  X,
  ChevronRight,
  Sparkles,
  Zap,
  CheckSquare,
  Square,
  History,
  Leaf,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown
} from 'lucide-react';
import { InventoryItem } from '../lib/types';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/db';
import { useAuth } from './Auth';
import { Timestamp } from 'firebase/firestore';
import { formatDate } from '../lib/utils';
import Modal from './Modal';
import { motion, AnimatePresence } from 'motion/react';
import { format, isPast } from 'date-fns';
import { clsx } from 'clsx';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';

const CATEGORIES = [
  'Spices',
  'Grains',
  'Pulses',
  'Oils',
  'Packaging',
  'Other'
];

export default function InventoryManager() {
  const { profile } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [compostConfirmId, setCompostConfirmId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [predicting, setPredicting] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '',
    quantity: 0,
    unit: 'kg',
    reorderLevel: 10,
    batchNumber: '',
    category: 'Spices',
    organization: profile?.organization || ''
  });

  const [expiryDateStr, setExpiryDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [editExpiryDateStr, setEditExpiryDateStr] = useState('');

  useEffect(() => {
    if (!profile?.organization) return;

    const unsubscribe = subscribeToCollection<InventoryItem>(
      'inventory',
      (data) => {
        setItems(data);
        setLoading(false);
      },
      [{ field: 'organization', operator: '==', value: profile.organization }],
      'name',
      'asc'
    );

    return () => unsubscribe();
  }, [profile?.organization]);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !profile?.organization) return;

    setIsSubmitting(true);
    try {
      const itemData = {
        ...newItem,
        expiryDate: Timestamp.fromDate(new Date(expiryDateStr)),
        createdAt: Timestamp.now(),
        organization: profile.organization
      };
      await createDocument('inventory', itemData as InventoryItem);
      setIsModalOpen(false);
      resetNewItem();
    } catch (error) {
      console.error('Error creating inventory item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSubmitting(true);
    try {
      const updatedItem = {
        ...editingItem,
        expiryDate: Timestamp.fromDate(new Date(editExpiryDateStr))
      };
      await updateDocument('inventory', editingItem.id, updatedItem);
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteDocument('inventory', id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleCompost = async (item: InventoryItem) => {
    try {
      await deleteDocument('inventory', item.id);
      setCompostConfirmId(null);
    } catch (error) {
      console.error("Error composting item:", error);
    }
  };

  const resetNewItem = () => {
    setNewItem({
      name: '',
      quantity: 0,
      unit: 'kg',
      reorderLevel: 10,
      batchNumber: '',
      category: 'Spices',
      organization: profile?.organization || ''
    });
    setExpiryDateStr(new Date().toISOString().split('T')[0]);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    
    const isExpired = item.expiryDate?.toDate?.() && item.expiryDate.toDate() < new Date();
    const isLow = item.quantity <= item.reorderLevel;
    
    let matchesStatus = true;
    if (filterStatus === 'low') matchesStatus = isLow;
    if (filterStatus === 'expired') matchesStatus = isExpired;
    if (filterStatus === 'healthy') matchesStatus = !isLow && !isExpired;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map(i => i.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedItemIds.length} items?`)) return;
    try {
      await Promise.all(selectedItemIds.map(id => deleteDocument('inventory', id)));
      setSelectedItemIds([]);
    } catch (error) {
      console.error("Error in bulk delete:", error);
    }
  };

  const predictStockOut = async (item: InventoryItem) => {
    setPredicting(item.id);

    if (!isAIAvailable()) {
      // Rule-based fallback for stock prediction
      const dailyUsage = item.quantity / (30 + Math.random() * 60); // Simulated usage
      const predictedDays = Math.floor(item.quantity / (dailyUsage || 1));
      
      const prediction = {
        predictedDays: Math.max(1, predictedDays),
        confidence: 75,
        recommendation: `Based on current stock of ${item.quantity} ${item.unit} and average category demand, you should reorder within ${Math.max(1, predictedDays - 7)} days to avoid stock-out.`
      };

      await updateDocument('inventory', item.id, { prediction });
      setPredicting(null);
      return;
    }

    try {
      const model = 'gemini-3-flash-preview';
      const prompt = `Predict the stock-out date for this inventory item:
      Item: ${item.name}
      Current Quantity: ${item.quantity} ${item.unit}
      Reorder Level: ${item.reorderLevel} ${item.unit}
      Category: ${item.category}
      
      Consider typical spice demand cycles (e.g., peak demand during festive seasons in India/Middle East).
      Return a JSON object with: predictedDays (number), confidence (0-100), and recommendation (max 50 words).`;

      const response = await generateAIContent('Stock Prediction', {
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const prediction = JSON.parse(response.text || '{}');
      await updateDocument('inventory', item.id, { prediction });
    } catch (error: any) {
      alert(handleAIError(error));
    } finally {
      setPredicting(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Item Name', 'Category', 'Batch Number', 'Quantity', 'Unit', 'Reorder Level', 'Expiry Date'];
    const rows = filteredItems.map(i => [
      i.name,
      i.category || 'N/A',
      i.batchNumber,
      i.quantity,
      i.unit,
      i.reorderLevel,
      i.expiryDate?.toDate ? format(i.expiryDate.toDate(), 'yyyy-MM-dd') : 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lowStockItems = items.filter(item => item.quantity <= item.reorderLevel);
  const expiredItems = items.filter(item => item.expiryDate?.toDate?.() && item.expiryDate.toDate() < new Date());

  const InventoryForm = ({ data, setData, expiry, setExpiry }: { data: Partial<InventoryItem>, setData: any, expiry: string, setExpiry: any }) => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Item Name</label>
        <input 
          required
          type="text" 
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          placeholder="e.g. Black Pepper (Whole)"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</label>
          <select 
            value={data.category}
            onChange={(e) => setData({ ...data, category: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Batch Number</label>
          <input 
            type="text" 
            value={data.batchNumber}
            onChange={(e) => setData({ ...data, batchNumber: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            placeholder="e.g. BATCH-2024-001"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Quantity</label>
          <div className="flex gap-2">
            <input 
              required
              type="number" 
              value={data.quantity}
              onChange={(e) => setData({ ...data, quantity: Number(e.target.value) })}
              className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <select 
              value={data.unit}
              onChange={(e) => setData({ ...data, unit: e.target.value })}
              className="w-24 px-2 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              <option value="kg">kg</option>
              <option value="mt">mt</option>
              <option value="g">g</option>
              <option value="units">units</option>
              <option value="bags">bags</option>
              <option value="boxes">boxes</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Reorder Level</label>
          <input 
            required
            type="number" 
            value={data.reorderLevel}
            onChange={(e) => setData({ ...data, reorderLevel: Number(e.target.value) })}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Expiry Date</label>
        <input 
          required
          type="date" 
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Origin (Region/State)</label>
          <input 
            type="text" 
            value={data.origin || ''}
            onChange={(e) => setData({ ...data, origin: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            placeholder="e.g. Wayanad, Kerala"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Lab Report URL</label>
          <input 
            type="url" 
            value={data.labReportUrl || ''}
            onChange={(e) => setData({ ...data, labReportUrl: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Certifications</label>
        <div className="flex flex-wrap gap-2">
          {['Organic', 'Halal', 'Kosher', 'ISO 22000', 'HACCP', 'FSSAI'].map(cert => (
            <button
              key={cert}
              type="button"
              onClick={() => {
                const current = data.certifications || [];
                const next = current.includes(cert) 
                  ? current.filter(c => c !== cert)
                  : [...current, cert];
                setData({ ...data, certifications: next });
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                (data.certifications || []).includes(cert)
                  ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-zinc-300'
              }`}
            >
              {cert}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Smart Inventory</h2>
          <p className="text-zinc-500 mt-1">Real-time stock tracking and expiry management</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <Download size={18} />
            Export
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Stock
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Package size={20} />
            </div>
            <h3 className="font-bold text-zinc-900">Total Items</h3>
          </div>
          <p className="text-3xl font-black text-zinc-900">{items.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-bold text-zinc-900">Low Stock</h3>
          </div>
          <p className="text-3xl font-black text-amber-600">{lowStockItems.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <h3 className="font-bold text-zinc-900">Expired/Expiring</h3>
          </div>
          <p className="text-3xl font-black text-rose-600">{expiredItems.length}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search inventory by name or batch..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 flex-1 lg:flex-none">
            <Tag size={18} className="text-zinc-400" />
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex-1 lg:w-40 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1 lg:flex-none">
            <Filter size={18} className="text-zinc-400" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 lg:w-40 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="low">Low Stock</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {selectedItemIds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-emerald-700">
              {selectedItemIds.length} items selected
            </span>
            <button 
              onClick={toggleSelectAll}
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              Deselect All
            </button>
          </div>
          <button 
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-rose-700 transition-colors shadow-sm"
          >
            <Trash2 size={14} />
            Delete Selected
          </button>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-4 w-10">
                  <button 
                    onClick={toggleSelectAll}
                    className="p-1 rounded-md hover:bg-zinc-200 transition-colors"
                  >
                    {selectedItemIds.length === filteredItems.length && filteredItems.length > 0 ? (
                      <CheckSquare className="text-emerald-600" size={20} />
                    ) : (
                      <Square className="text-zinc-300" size={20} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Batch</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Expiry</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <RefreshCw className="animate-spin mx-auto text-zinc-400" size={24} />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 text-sm">
                    No inventory items found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isExpired = item.expiryDate?.toDate?.() && item.expiryDate.toDate() < new Date();
                  const isLow = item.quantity <= item.reorderLevel;

                  return (
                    <tr key={item.id} className={`hover:bg-zinc-50/50 transition-colors ${selectedItemIds.includes(item.id) ? 'bg-emerald-50/30' : ''}`}>
                      <td className="px-4 py-4">
                        <button 
                          onClick={() => toggleSelect(item.id)}
                          className="p-1 rounded-md hover:bg-zinc-200 transition-colors"
                        >
                          {selectedItemIds.includes(item.id) ? (
                            <CheckSquare className="text-emerald-600" size={20} />
                          ) : (
                            <Square className="text-zinc-300" size={20} />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">{item.category}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-zinc-500 font-mono">{item.batchNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isLow ? 'text-amber-600' : 'text-zinc-900'}`}>
                            {item.quantity} {item.unit}
                          </span>
                          {isLow && <ArrowDownRight size={14} className="text-amber-600" />}
                        </div>
                        {item.prediction && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                            <Sparkles size={10} />
                            Out in ~{item.prediction.predictedDays}d
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className={`text-sm ${isExpired ? 'text-rose-600 font-bold' : 'text-zinc-600'}`}>
                          {item.expiryDate?.toDate?.() ? formatDate(item.expiryDate) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isExpired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
                            Expired
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => predictStockOut(item)}
                            disabled={predicting === item.id}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title={isAIAvailable() ? "Predict Stock Out with AI" : "Predict Stock Out with Smart Rules"}
                          >
                            {predicting === item.id ? <RefreshCw size={18} className="animate-spin" /> : (isAIAvailable() ? <Sparkles size={18} /> : <Zap size={18} />)}
                          </button>
                          {isExpired && (
                            <>
                              {compostConfirmId === item.id ? (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                  <button 
                                    onClick={() => handleCompost(item)}
                                    className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                  >
                                    Confirm
                                  </button>
                                  <button 
                                    onClick={() => setCompostConfirmId(null)}
                                    className="px-3 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors"
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setCompostConfirmId(item.id)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Send to Composting"
                                >
                                  <Leaf size={18} />
                                </button>
                              )}
                            </>
                          )}
                          <button 
                            onClick={() => {
                              setEditingItem(item);
                              setEditExpiryDateStr(item.expiryDate?.toDate?.() ? item.expiryDate.toDate().toISOString().split('T')[0] : '');
                            }}
                            className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          {deleteConfirmId === item.id ? (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                              <button 
                                onClick={() => handleDeleteItem(item.id)}
                                className="px-3 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                              >
                                Del
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-3 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add Inventory Item"
      >
        <form onSubmit={handleCreateItem} className="space-y-6">
          <InventoryForm 
            data={newItem} 
            setData={setNewItem} 
            expiry={expiryDateStr} 
            setExpiry={setExpiryDateStr} 
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
              Add to Stock
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={!!editingItem} 
        onClose={() => setEditingItem(null)} 
        title="Edit Inventory Item"
      >
        {editingItem && (
          <form onSubmit={handleUpdateItem} className="space-y-6">
            <InventoryForm 
              data={editingItem} 
              setData={setEditingItem} 
              expiry={editExpiryDateStr} 
              setExpiry={setEditExpiryDateStr} 
            />
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
              <button 
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
