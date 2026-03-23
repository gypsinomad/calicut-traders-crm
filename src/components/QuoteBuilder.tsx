import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, FileText, Calculator, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from './Auth';
import { createDocument, updateDocument, OperationType, handleFirestoreError } from '../services/db';
import { Quote, QuoteItem, Lead } from '../lib/types';
import { Timestamp } from 'firebase/firestore';
import { generateDocument } from '../lib/documentGenerator';

interface QuoteBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  quote?: Quote;
  lead?: Lead;
  onSaved?: (quoteId: string) => void;
}

const SPICES = [
  'Black Pepper', 'Cardamom', 'Ginger', 'Turmeric', 'Cinnamon', 
  'Cloves', 'Nutmeg', 'Mace', 'Star Anise', 'Cumin', 'Coriander'
];

const GRADES = ['FAQ', 'ASTA', 'Extra Bold', 'Bold', 'Medium', 'Split', 'Whole'];
const UNITS = ['MT', 'KG', 'LBS', 'TONS'];
const CURRENCIES = ['USD', 'EUR', 'INR', 'AED', 'GBP'];
const INCOTERMS = ['FOB', 'CIF', 'CNF', 'EXW', 'DDP', 'DAP'];
const PAYMENT_TERMS = [
  'T/T 30% Advance, 70% against Docs',
  '100% Advance T/T',
  'L/C at Sight',
  'D/P at Sight',
  'CAD (Cash Against Documents)'
];
const PACKAGING_OPTIONS = [
  'PP Bags 25kg', 'Jute Bags 50kg', 'Paper Bags 20kg', 'Custom Packaging'
];
const PORTS = ['Cochin', 'Chennai', 'Mumbai', 'JNPT', 'Tuticorin'];

export default function QuoteBuilder({ isOpen, onClose, quote, lead, onSaved }: QuoteBuilderProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [quoteNumber, setQuoteNumber] = useState(quote?.quoteNumber || `QT-${Math.floor(100000 + Math.random() * 900000)}`);
  const [companyName, setCompanyName] = useState(quote?.companyName || lead?.companyName || '');
  const [contactName, setContactName] = useState(quote?.contactName || lead?.fullName || '');
  const [email, setEmail] = useState(quote?.email || lead?.email || '');
  const [phone, setPhone] = useState(quote?.phone || lead?.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(quote?.whatsappNumber || lead?.whatsappNumber || lead?.phone || '');
  const [destinationCountry, setDestinationCountry] = useState(quote?.destinationCountry || lead?.destinationCountry || '');
  
  const [items, setItems] = useState<QuoteItem[]>(quote?.items || [{
    productId: Math.random().toString(36).substr(2, 9),
    productName: SPICES[0],
    quantity: 1,
    unit: 'MT',
    unitPrice: 0,
    totalPrice: 0
  }]);
  
  const [currency, setCurrency] = useState(quote?.currency || 'USD');
  const [incoterms, setIncoterms] = useState(quote?.incoterms || 'FOB');
  const [paymentTerms, setPaymentTerms] = useState(quote?.paymentTerms || PAYMENT_TERMS[0]);
  const [packaging, setPackaging] = useState(quote?.packaging || PACKAGING_OPTIONS[0]);
  const [portOfLoading, setPortOfLoading] = useState(quote?.portOfLoading || PORTS[0]);
  const [validUntil, setValidUntil] = useState(
    quote?.validUntil 
      ? quote.validUntil.toDate().toISOString().split('T')[0] 
      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [specialNotes, setSpecialNotes] = useState(quote?.specialNotes || '');
  
  const [freightEstimate, setFreightEstimate] = useState(quote?.freightEstimate || 0);
  const [insuranceRate, setInsuranceRate] = useState(0.005); // 0.5% default
  
  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const insurance = subtotal * insuranceRate;
  const totalAmount = subtotal + freightEstimate + insurance;

  useEffect(() => {
    if (quote) {
      setQuoteNumber(quote.quoteNumber || `QT-${Math.floor(100000 + Math.random() * 900000)}`);
      setCompanyName(quote.companyName || '');
      setContactName(quote.contactName || '');
      setEmail(quote.email || '');
      setPhone(quote.phone || '');
      setWhatsappNumber(quote.whatsappNumber || '');
      setDestinationCountry(quote.destinationCountry || '');
      setItems(quote.items || []);
      setCurrency(quote.currency || 'USD');
      setIncoterms(quote.incoterms || 'FOB');
      setPaymentTerms(quote.paymentTerms || PAYMENT_TERMS[0]);
      setPackaging(quote.packaging || PACKAGING_OPTIONS[0]);
      setPortOfLoading(quote.portOfLoading || PORTS[0]);
      if (quote.validUntil) {
        try {
          setValidUntil(quote.validUntil.toDate().toISOString().split('T')[0]);
        } catch (e) {
          setValidUntil(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        }
      }
      setSpecialNotes(quote.specialNotes || '');
      setFreightEstimate(quote.freightEstimate || 0);
    } else if (lead) {
      setCompanyName(lead.companyName);
      setContactName(lead.fullName);
      setEmail(lead.email);
      setPhone(lead.phone);
      setWhatsappNumber(lead.whatsappNumber || lead.phone);
      setDestinationCountry(lead.destinationCountry);
    }
  }, [quote, lead]);

  const addItem = () => {
    setItems([...items, {
      productId: Math.random().toString(36).substr(2, 9),
      productName: SPICES[0],
      quantity: 1,
      unit: 'MT',
      unitPrice: 0,
      totalPrice: 0
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, updates: Partial<QuoteItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    // Auto-calculate total price
    if ('quantity' in updates || 'unitPrice' in updates) {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setItems(newItems);
  };

  const handleSave = async (status: Quote['status'] = 'draft') => {
    if (!profile) return;
    setLoading(true);
    
    const quoteData: Partial<Quote> = {
      quoteNumber,
      leadId: lead?.id || quote?.leadId,
      companyName,
      contactName,
      email,
      phone,
      whatsappNumber,
      destinationCountry,
      items,
      subtotal,
      freightEstimate,
      insurance,
      totalAmount,
      currency,
      incoterms,
      paymentTerms,
      packaging,
      portOfLoading,
      validUntil: Timestamp.fromDate(new Date(validUntil)),
      status,
      specialNotes,
      organization: profile.organization,
      createdBy: profile.uid,
      createdAt: quote?.createdAt || Timestamp.now()
    };

    try {
      let id = quote?.id;
      if (id) {
        await updateDocument('quotes', id, quoteData);
      } else {
        id = await createDocument('quotes', quoteData);
      }
      
      if (status === 'sent') {
        // If generating PI, we also create a generated document record
        const html = generateDocument('proformaInvoice', {
          orderNumber: quoteNumber,
          customerName: companyName,
          commodity: items[0].productName,
          quantity: items[0].quantity,
          unit: items[0].unit,
          totalAmount: totalAmount,
          currency,
          destination: destinationCountry,
          destinationCountry,
          incoterms,
          paymentTerms,
          items: items.map(i => ({
            productName: i.productName,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice
          }))
        } as any);

        await createDocument('generated_documents', {
          orderId: id, // Linking to quote ID for now
          documentType: 'proformaInvoice',
          generatedAt: Timestamp.now(),
          generatedBy: profile.uid,
          htmlContent: html,
          status: 'finalized',
          organization: profile.organization
        });
      }

      onSaved?.(id!);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'quotes');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                {quote ? 'Edit Quote' : 'Create New Quote'}
              </h2>
              <p className="text-zinc-500 font-medium">{quoteNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Buyer Details */}
            <div className="lg:col-span-1 space-y-8">
              <section>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  Buyer Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="e.g. Spice Global Traders"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                        placeholder="buyer@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">WhatsApp</label>
                      <input
                        type="text"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                        placeholder="+91..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Destination Country</label>
                    <input
                      type="text"
                      value={destinationCountry}
                      onChange={(e) => setDestinationCountry(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="e.g. United Arab Emirates"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  Quote Settings
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold"
                      >
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Valid Until</label>
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Incoterms</label>
                    <select
                      value={incoterms}
                      onChange={(e) => setIncoterms(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold"
                    >
                      {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Items & Terms */}
            <div className="lg:col-span-2 space-y-10">
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    Line Items
                  </h3>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={16} /> Add Item
                  </button>
                </div>
                
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.productId} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-wrap gap-4 items-end">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Commodity</label>
                        <select
                          value={item.productName}
                          onChange={(e) => updateItem(index, { productName: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg font-bold text-sm"
                        >
                          {SPICES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg font-bold text-sm"
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, { unit: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg font-bold text-sm"
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="w-32">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Unit Price ({currency})</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg font-bold text-sm"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Total</label>
                        <div className="px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-lg font-black text-sm text-zinc-600">
                          {item.totalPrice.toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <section className="space-y-6">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    Terms & Logistics
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Payment Terms</label>
                      <select
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-medium"
                      >
                        {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Packaging</label>
                      <select
                        value={packaging}
                        onChange={(e) => setPackaging(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-medium"
                      >
                        {PACKAGING_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Port of Loading</label>
                      <select
                        value={portOfLoading}
                        onChange={(e) => setPortOfLoading(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-medium"
                      >
                        {PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Special Notes</label>
                      <textarea
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-medium resize-none"
                        placeholder="Any additional requirements..."
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-zinc-900 rounded-3xl p-8 text-white space-y-6 shadow-xl">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    Quote Summary
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-bold text-white">{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-zinc-400">
                        <span className="font-medium">Freight Estimate</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{currency}</span>
                          <input
                            type="number"
                            value={freightEstimate}
                            onChange={(e) => setFreightEstimate(parseFloat(e.target.value) || 0)}
                            className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-right font-bold text-white outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Insurance (0.5%)</span>
                        <Calculator size={14} />
                      </div>
                      <span className="font-bold text-white">{currency} {insurance.toLocaleString()}</span>
                    </div>

                    <div className="pt-6 border-t border-zinc-800">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Total Value</span>
                        <div className="text-right">
                          <span className="text-emerald-400 font-black text-3xl block">
                            {currency} {totalAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                            {incoterms} {destinationCountry}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <button
                      onClick={() => handleSave('sent')}
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-3"
                    >
                      <Sparkles size={18} />
                      Generate Proforma Invoice
                    </button>
                    <button
                      onClick={() => handleSave('draft')}
                      disabled={loading}
                      className="w-full bg-zinc-800 text-zinc-300 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center justify-center gap-3"
                    >
                      <Save size={18} />
                      Save as Draft
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
