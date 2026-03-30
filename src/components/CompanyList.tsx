import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Building2, 
  Mail, 
  Globe,
  MapPin,
  ShieldCheck,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  Save,
  X
} from 'lucide-react';
import { Company } from '../lib/types.ts';
import Modal from './Modal.tsx';
import { subscribeToCollection, createDocument } from '../services/db';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';

export default function CompanyList() {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    displayName: '',
    legalName: '',
    type: 'customer',
    email: '',
    phone: '',
    website: '',
    address: {
      line1: '',
      street: '',
      city: '',
      state: '',
      country: '',
      pinCode: '',
      postalCode: ''
    },
    organization: profile?.organization || 'Global Trade Connect LLP'
  });

  useEffect(() => {
    const unsubscribe = subscribeToCollection<Company>('companies', (data) => {
      setCompanies(data);
      setLoading(false);
    }, undefined, 'displayName', 'asc');

    return () => unsubscribe();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.displayName || !newCompany.type) return;

    setIsSubmitting(true);
    try {
      const companyData = {
        ...newCompany,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        organization: profile?.organization || 'Global Trade Connect LLP'
      };
      await createDocument('companies', companyData as Company);
      setIsModalOpen(false);
      setNewCompany({
        displayName: '',
        legalName: '',
        type: 'customer',
        email: '',
        phone: '',
        website: '',
        address: {
          line1: '',
          street: '',
          city: '',
          state: '',
          country: '',
          pinCode: '',
          postalCode: ''
        }
      });
    } catch (error) {
      console.error('Error creating company:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = 
      (company.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (company.legalName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (company.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || company.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Companies</h2>
          <p className="text-zinc-500 mt-1">Manage customers, suppliers and partners</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add Company
        </button>
      </header>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Company"
      >
        <form onSubmit={handleCreateCompany} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Display Name</label>
              <input 
                required
                type="text" 
                value={newCompany.displayName}
                onChange={(e) => setNewCompany({ ...newCompany, displayName: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. Global Trade Connect Imports"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Legal Name</label>
              <input 
                type="text" 
                value={newCompany.legalName}
                onChange={(e) => setNewCompany({ ...newCompany, legalName: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. Global Trade Connect Imports GmbH"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Company Type</label>
              <select 
                value={newCompany.type}
                onChange={(e) => setNewCompany({ ...newCompany, type: e.target.value as any })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
                <option value="partner">Partner</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Country</label>
              <input 
                required
                type="text" 
                value={newCompany.address?.country}
                onChange={(e) => setNewCompany({ 
                  ...newCompany, 
                  address: { ...newCompany.address!, country: e.target.value } 
                })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. Germany"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                value={newCompany.email}
                onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="contact@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone Number</label>
              <input 
                type="tel" 
                value={newCompany.phone}
                onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="+1 234 567 890"
              />
            </div>
          </div>
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
              {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              Add Company
            </button>
          </div>
        </form>
      </Modal>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search companies..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="customer">Customers</option>
            <option value="supplier">Suppliers</option>
            <option value="partner">Partners</option>
          </select>
          <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-zinc-200">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-zinc-500 font-medium">Loading companies...</p>
            </div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-zinc-200">
            <p className="text-zinc-400 text-sm font-medium">No companies found matching your criteria</p>
          </div>
        ) : (
          filteredCompanies.map((company) => (
            <div key={company.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-zinc-50 rounded-xl text-zinc-600 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <Building2 size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    company.type === 'customer' ? 'bg-blue-100 text-blue-700' :
                    company.type === 'supplier' ? 'bg-amber-100 text-amber-700' :
                    'bg-zinc-100 text-zinc-700'
                  }`}>
                    {company.type}
                  </span>
                  <button className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex-1">
                <h3 className="text-lg font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">{company.displayName}</h3>
                <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{company.legalName}</p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-zinc-600">
                  <MapPin size={16} className="text-zinc-400" />
                  <span className="text-sm truncate">{company.address?.city}, {company.address?.country}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-600">
                  <Mail size={16} className="text-zinc-400" />
                  <span className="text-sm truncate">{company.email}</span>
                </div>
                {company.compliance?.fssaiNumber && (
                  <div className="flex items-center gap-3 text-emerald-600">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="text-xs font-medium">FSSAI: {company.compliance.fssaiNumber}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {company.website && (
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe size={18} />
                    </a>
                  )}
                  <a 
                    href={`mailto:${company.email}`} 
                    className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail size={18} />
                  </a>
                </div>
                <button className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                  View Details
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
