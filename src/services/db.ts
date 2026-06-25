import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  WhereFilterOp,
  Timestamp
} from 'firebase/firestore';
import { auth, db, isFirebaseReadOnly } from '../firebase';
import { toast } from 'sonner';
import { FirestoreOperation as OperationType, UserRole, DEFAULT_ORGANIZATION } from '../lib/constants';
export { auth, db, OperationType };

// --- CLIENT-SIDE MOCK DATABASE FALLBACK ---
const getMockTimestamp = (daysOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return Timestamp.fromDate(date);
};

const initialMockData: Record<string, any[]> = {
  leads: [
    {
      id: 'lead-1',
      fullName: 'John Doe',
      companyName: 'Atlantic Food Distributors Inc.',
      email: 'john@atlanticfoods.com',
      phone: '+1 555-0199',
      status: 'qualified',
      source: 'website',
      createdAt: getMockTimestamp(-5),
      assignedUserId: 'demo-guest-uid-12345',
      productInterest: 'Premium Black Pepper (MG-1)',
      destinationCountry: 'United States',
      incotermsPreference: 'FOB',
      priority: 'hot',
      organization: 'Calicut Traders',
      smartScore: 88,
      smartScoreExplanation: 'Strong interest in container-load volume with valid FDA registration.',
      aiInsights: {
        temperature: 'hot',
        strengths: ['Active communication', 'Verified import credentials'],
        concerns: ['Strict delivery timeline requested'],
        nextStep: 'Send Proforma Invoice for review',
        scoredAt: getMockTimestamp(-1)
      }
    },
    {
      id: 'lead-2',
      fullName: 'Ahmed Hassan',
      companyName: 'Gulf Oasis Trading LLC',
      email: 'ahmed@gulfoasis.ae',
      phone: '+971 50 123 4567',
      status: 'new',
      source: 'whatsapp',
      createdAt: getMockTimestamp(-2),
      assignedUserId: 'demo-guest-uid-12345',
      productInterest: 'Green Cardamom (8mm Bold)',
      destinationCountry: 'United Arab Emirates',
      incotermsPreference: 'CIF',
      priority: 'warm',
      organization: 'Calicut Traders',
      smartScore: 65,
      smartScoreExplanation: 'Inquired via WhatsApp for sample dispatch to Dubai.',
      aiInsights: {
        temperature: 'warm',
        strengths: ['High-value commodity interest', 'Direct communication'],
        concerns: ['Unverified company registration'],
        nextStep: 'Confirm sample delivery address',
        scoredAt: getMockTimestamp()
      }
    },
    {
      id: 'lead-3',
      fullName: 'Sarah Jenkins',
      companyName: 'EuroSpices Ltd',
      email: 'sjenkins@eurospices.co.uk',
      phone: '+44 20 7946 0958',
      status: 'converted',
      source: 'tradeShow',
      createdAt: getMockTimestamp(-15),
      assignedUserId: 'demo-guest-uid-12345',
      productInterest: 'Organic Turmeric Powder',
      destinationCountry: 'United Kingdom',
      incotermsPreference: 'CFR',
      priority: 'warm',
      organization: 'Calicut Traders',
      smartScore: 92,
      smartScoreExplanation: 'Successfully converted to active Order ORD-2026-002.',
      aiInsights: {
        temperature: 'warm',
        strengths: ['Long-term contract potential', 'Prompt payments'],
        concerns: ['High custom compliance standards'],
        nextStep: 'Follow up on shipment clearance',
        scoredAt: getMockTimestamp(-10)
      }
    }
  ],
  orders: [
    {
      id: 'order-1',
      orderNumber: 'ORD-2026-001',
      customerName: 'Atlantic Food Distributors Inc.',
      title: 'Premium Black Pepper Shipment',
      commodity: 'Black Pepper & Cloves',
      quantity: 18,
      unit: 'MT',
      stage: 'production',
      status: 'In Production',
      totalAmount: 84500,
      totalValue: 84500,
      destination: 'New York Port',
      destinationCountry: 'United States',
      createdAt: getMockTimestamp(-8),
      assignedUserId: 'demo-guest-uid-12345',
      companyId: 'company-1',
      contactId: 'lead-1',
      currency: 'USD',
      incoterms: 'FOB',
      paymentTerms: 'TT',
      productType: 'Spices',
      docsCompleted: 4,
      docsTotal: 8,
      organization: 'Calicut Traders',
      priority: 'high',
      shipmentStatus: 'Preparing Package'
    },
    {
      id: 'order-2',
      orderNumber: 'ORD-2026-002',
      customerName: 'EuroSpices Ltd',
      title: 'Organic Turmeric Finger Export',
      commodity: 'Organic Turmeric Powder',
      quantity: 12,
      unit: 'MT',
      stage: 'customs',
      status: 'Customs Clearance',
      totalAmount: 51200,
      totalValue: 51200,
      destination: 'London Gateway',
      destinationCountry: 'United Kingdom',
      createdAt: getMockTimestamp(-14),
      assignedUserId: 'demo-guest-uid-12345',
      companyId: 'company-3',
      contactId: 'lead-3',
      currency: 'USD',
      incoterms: 'CFR',
      paymentTerms: 'LC',
      productType: 'Spices',
      docsCompleted: 7,
      docsTotal: 8,
      organization: 'Calicut Traders',
      priority: 'medium',
      shipmentStatus: 'Awaiting Customs Release'
    },
    {
      id: 'order-3',
      orderNumber: 'ORD-2026-003',
      customerName: 'Gulf Oasis Trading LLC',
      title: 'Cardamom & Cashew Consolidation',
      commodity: 'Cashews & Cardamom',
      quantity: 5,
      unit: 'MT',
      stage: 'shipped',
      status: 'In Transit',
      totalAmount: 110400,
      totalValue: 110400,
      destination: 'Jebel Ali Port',
      destinationCountry: 'United Arab Emirates',
      createdAt: getMockTimestamp(-20),
      assignedUserId: 'demo-guest-uid-12345',
      companyId: 'company-2',
      contactId: 'lead-2',
      currency: 'USD',
      incoterms: 'CIF',
      paymentTerms: 'DP',
      productType: 'Spices',
      docsCompleted: 8,
      docsTotal: 8,
      organization: 'Calicut Traders',
      priority: 'urgent',
      shipmentStatus: 'On Vessel',
      vesselName: 'Ocean Star v12',
      containerNumber: 'MSCU1234567',
      etd: getMockTimestamp(-5),
      eta: getMockTimestamp(12)
    }
  ],
  companies: [
    {
      id: 'company-1',
      legalName: 'Atlantic Food Distributors Inc.',
      displayName: 'Atlantic Foods',
      type: 'customer',
      address: {
        line1: '100 Atlantic Way',
        city: 'Boston',
        state: 'MA',
        pinCode: '02108',
        country: 'United States'
      },
      email: 'info@atlanticfoods.com',
      phone: '+1 555-0199',
      website: 'www.atlanticfoods.com',
      createdAt: getMockTimestamp(-30),
      updatedAt: getMockTimestamp(-5),
      compliance: {
        gstin: '',
        iec: 'IE10023456',
        pan: ''
      },
      organization: 'Calicut Traders'
    },
    {
      id: 'company-2',
      legalName: 'Gulf Oasis Trading LLC',
      displayName: 'Gulf Oasis',
      type: 'customer',
      address: {
        line1: 'Sheikh Zayed Road, Financial District',
        city: 'Dubai',
        state: 'Dubai',
        pinCode: '00000',
        country: 'United Arab Emirates'
      },
      email: 'procurement@gulfoasis.ae',
      phone: '+971 50 123 4567',
      website: 'www.gulfoasis.ae',
      createdAt: getMockTimestamp(-25),
      updatedAt: getMockTimestamp(-2),
      compliance: {
        gstin: '',
        iec: 'IE99887766',
        pan: ''
      },
      organization: 'Calicut Traders'
    },
    {
      id: 'company-3',
      legalName: 'EuroSpices Ltd',
      displayName: 'EuroSpices',
      type: 'customer',
      address: {
        line1: '45 Greenwich High Rd',
        city: 'London',
        state: 'Greater London',
        pinCode: 'SE10 8JL',
        country: 'United Kingdom'
      },
      email: 'orders@eurospices.co.uk',
      phone: '+44 20 7946 0958',
      website: 'www.eurospices.co.uk',
      createdAt: getMockTimestamp(-40),
      updatedAt: getMockTimestamp(-14),
      compliance: {
        gstin: '',
        iec: 'IE33445522',
        pan: ''
      },
      organization: 'Calicut Traders'
    }
  ],
  inventory: [
    {
      id: 'inv-1',
      name: 'Premium Black Pepper (MG-1)',
      quantity: 24500,
      unit: 'kg',
      expiryDate: getMockTimestamp(360),
      reorderLevel: 5000,
      batchNumber: 'BP-2026-B4',
      category: 'Spices',
      origin: 'Wayanad, India',
      organization: 'Calicut Traders',
      createdAt: getMockTimestamp(-60),
      prediction: {
        stockOutDate: getMockTimestamp(120),
        predictedDays: 120,
        confidence: 0.95,
        reasoning: 'Consistent average monthly export of 6,000 kg with current inventory level.'
      }
    },
    {
      id: 'inv-2',
      name: 'Organic Turmeric Finger (Alleppey)',
      quantity: 18000,
      unit: 'kg',
      expiryDate: getMockTimestamp(450),
      reorderLevel: 4000,
      batchNumber: 'TR-2026-A1',
      category: 'Spices',
      origin: 'Alleppey, India',
      organization: 'Calicut Traders',
      createdAt: getMockTimestamp(-60),
      prediction: {
        stockOutDate: getMockTimestamp(180),
        predictedDays: 180,
        confidence: 0.92,
        reasoning: 'Increasing customer demand in UK region.'
      }
    },
    {
      id: 'inv-3',
      name: 'Green Cardamom (8mm Bold)',
      quantity: 1200,
      unit: 'kg',
      expiryDate: getMockTimestamp(180),
      reorderLevel: 1500,
      batchNumber: 'CD-2026-X8',
      category: 'Spices',
      origin: 'Idukki, India',
      organization: 'Calicut Traders',
      createdAt: getMockTimestamp(-30),
      prediction: {
        stockOutDate: getMockTimestamp(15),
        predictedDays: 15,
        confidence: 0.88,
        reasoning: 'Stock level is below reorder threshold. Outstanding orders of 1.5 MT require urgent restocking.'
      }
    }
  ],
  suppliers: [
    {
      id: 'supplier-1',
      name: 'Wayanad Organic Growers Cooperative',
      contactPerson: 'Manoj Kumar',
      email: 'manoj@wayanadorganic.com',
      certificates: ['APEDA Organic Certificate', 'FSSAI License'],
      compliance: ['Verified Source', 'FairTrade Compliant'],
      organization: 'Calicut Traders',
      createdAt: getMockTimestamp(-120),
      rating: 4.8,
      riskScore: 12,
      category: 'Organic Spices',
      location: 'Wayanad, Kerala',
      status: 'active',
      riskAnalysis: {
        score: 12,
        level: 'low',
        keyRisks: ['Slight rain delays in high monsoon months'],
        lastAnalyzed: getMockTimestamp(-3)
      }
    },
    {
      id: 'supplier-2',
      name: 'Alleppey Turmeric Syndicate',
      contactPerson: 'Suresh Nair',
      email: 'suresh@turmalleppey.com',
      certificates: ['FSSAI License', 'ISO 22000'],
      compliance: ['HACCP Compliant', 'GMP Certified'],
      organization: 'Calicut Traders',
      createdAt: getMockTimestamp(-100),
      rating: 4.5,
      riskScore: 18,
      category: 'Turmeric Processing',
      location: 'Alappuzha, Kerala',
      status: 'active',
      riskAnalysis: {
        score: 18,
        level: 'low',
        keyRisks: ['Price volatility on commodities exchange'],
        lastAnalyzed: getMockTimestamp(-5)
      }
    }
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Submit Phytosanitary Certificate for ORD-2026-002',
      description: 'Upload certified laboratory test results and acquire phytosanitary customs authorization.',
      status: 'open',
      priority: 'high',
      dueDate: getMockTimestamp(3),
      assigneeId: 'demo-guest-uid-12345',
      createdAt: getMockTimestamp(-2),
      organization: 'Calicut Traders'
    },
    {
      id: 'task-2',
      title: 'Follow up on John Doe sample arrival',
      description: 'Confirm via email or call if the 500g cardamom samples reached Boston facility.',
      status: 'inProgress',
      priority: 'medium',
      dueDate: getMockTimestamp(1),
      assigneeId: 'demo-guest-uid-12345',
      createdAt: getMockTimestamp(-1),
      organization: 'Calicut Traders'
    }
  ],
  quotes: [
    {
      id: 'quote-1',
      quoteNumber: 'QT-2026-014',
      leadId: 'lead-1',
      companyId: 'company-1',
      companyName: 'Atlantic Food Distributors Inc.',
      contactName: 'John Doe',
      email: 'john@atlanticfoods.com',
      phone: '+1 555-0199',
      destinationCountry: 'United States',
      items: [
        {
          productId: 'inv-1',
          productName: 'Premium Black Pepper (MG-1)',
          quantity: 18,
          unit: 'MT',
          unitPrice: 4200,
          totalPrice: 75600
        }
      ],
      subtotal: 75600,
      freightEstimate: 7400,
      insurance: 1500,
      totalAmount: 84500,
      currency: 'USD',
      incoterms: 'FOB',
      paymentTerms: 'TT 30 Days',
      packaging: '50kg Jute Bags on Pallets',
      portOfLoading: 'Cochin Port, India',
      validUntil: getMockTimestamp(30),
      status: 'accepted',
      createdAt: getMockTimestamp(-10),
      createdBy: 'demo-guest-uid-12345',
      organization: 'Calicut Traders'
    },
    {
      id: 'quote-2',
      quoteNumber: 'QT-2026-015',
      leadId: 'lead-2',
      companyId: 'company-2',
      companyName: 'Gulf Oasis Trading LLC',
      contactName: 'Ahmed Hassan',
      email: 'ahmed@gulfoasis.ae',
      phone: '+971 50 123 4567',
      destinationCountry: 'United Arab Emirates',
      items: [
        {
          productId: 'inv-3',
          productName: 'Green Cardamom (8mm Bold)',
          quantity: 2,
          unit: 'MT',
          unitPrice: 18500,
          totalPrice: 37000
        }
      ],
      subtotal: 37000,
      freightEstimate: 4200,
      insurance: 800,
      totalAmount: 42000,
      currency: 'USD',
      incoterms: 'CIF',
      paymentTerms: 'Letter of Credit',
      packaging: 'Vaccuum Pack in Carton boxes',
      portOfLoading: 'Cochin Port, India',
      validUntil: getMockTimestamp(45),
      status: 'sent',
      createdAt: getMockTimestamp(-2),
      createdBy: 'demo-guest-uid-12345',
      organization: 'Calicut Traders'
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'New Lead Assigned',
      message: 'Ahmed Hassan from Gulf Oasis Trading LLC has been registered and assigned to your portfolio.',
      type: 'info',
      timestamp: getMockTimestamp(-1),
      read: false,
      userId: 'demo-guest-uid-12345',
      organization: 'Calicut Traders'
    },
    {
      id: 'notif-2',
      title: 'Urgent: Low Stock Warning',
      message: 'Green Cardamom (8mm Bold) is below reorder level (1,200 kg remaining). Restocking advised.',
      type: 'warning',
      timestamp: getMockTimestamp(),
      read: false,
      userId: 'demo-guest-uid-12345',
      organization: 'Calicut Traders'
    }
  ],
  market_prices: [
    {
      id: 'price-1',
      product: 'Premium Black Pepper',
      commodity: 'Black Pepper',
      region: 'Kochi Trade Exchange',
      price: 6.25,
      currency: 'USD',
      unit: 'kg',
      trend: 'up',
      timestamp: getMockTimestamp(),
      prediction: {
        trend: 'up',
        confidence: 0.94,
        reasoning: 'Strong global demand paired with delayed crop arrivals in competing Vietnam market.'
      }
    },
    {
      id: 'price-2',
      product: 'Premium Green Cardamom (8mm)',
      commodity: 'Cardamom',
      region: 'Spices Board Auction',
      price: 28.50,
      currency: 'USD',
      unit: 'kg',
      trend: 'down',
      timestamp: getMockTimestamp(),
      prediction: {
        trend: 'stable',
        confidence: 0.85,
        reasoning: 'Supply leveling out as secondary harvesting begins in Kerala high-ranges.'
      }
    },
    {
      id: 'price-3',
      product: 'Alleppey Turmeric Fingers',
      commodity: 'Turmeric',
      region: 'Nizamabad APMC',
      price: 2.15,
      currency: 'USD',
      unit: 'kg',
      trend: 'up',
      timestamp: getMockTimestamp(),
      prediction: {
        trend: 'up',
        confidence: 0.90,
        reasoning: 'Export demand surges for certified organic curcumin products.'
      }
    }
  ],
  messages: [],
  daily_objectives: [],
  procurement_orders: [],
  transactions: []
};

// Recursive function to restore Timestamp objects
function restoreTimestamps(val: any): any {
  if (!val) return val;
  if (typeof val === 'object') {
    if ('seconds' in val && 'nanoseconds' in val && typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
      return new Timestamp(val.seconds, val.nanoseconds);
    }
    if (Array.isArray(val)) {
      return val.map(restoreTimestamps);
    }
    const restored: any = {};
    for (const key in val) {
      restored[key] = restoreTimestamps(val[key]);
    }
    return restored;
  }
  return val;
}

function getMockDocuments(path: string): any[] {
  const localKey = `mock_db_${path}`;
  const localData = localStorage.getItem(localKey);
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      return parsed.map((item: any) => restoreTimestamps(item));
    } catch (e) {
      console.error("Failed to parse mock data, resetting:", e);
    }
  }
  
  const initial = initialMockData[path] || [];
  localStorage.setItem(localKey, JSON.stringify(initial));
  return initial;
}

function saveMockDocuments(path: string, data: any[]) {
  localStorage.setItem(`mock_db_${path}`, JSON.stringify(data));
}

type ListenerCallback = (data: any[]) => void;
const mockListeners: Record<string, Set<ListenerCallback>> = {};

function notifyMockListeners(path: string) {
  if (mockListeners[path]) {
    const data = getMockDocuments(path);
    mockListeners[path].forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error("Error in mock listener callback:", err);
      }
    });
  }
}

// Check if we should bypass to Mock Data Engine
const isMockBypass = () => {
  return isFirebaseReadOnly || !auth.currentUser;
};
// ------------------------------------------

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const getDocuments = async <T>(
  path: string, 
  filters?: { field: string; operator: WhereFilterOp; value: any }[],
  sortField?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  if (isMockBypass()) {
    let list = getMockDocuments(path);
    if (filters) {
      list = list.filter(item => {
        return filters.every(f => {
          const itemVal = item[f.field];
          if (f.operator === '==') return itemVal === f.value;
          if (f.operator === '!=') return itemVal !== f.value;
          if (f.operator === '>') return itemVal > f.value;
          if (f.operator === '>=') return itemVal >= f.value;
          if (f.operator === '<') return itemVal < f.value;
          if (f.operator === '<=') return itemVal <= f.value;
          if (f.operator === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(f.value);
          return true;
        });
      });
    }
    if (sortField) {
      list.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (valA instanceof Timestamp) valA = valA.toMillis();
        if (valB instanceof Timestamp) valB = valB.toMillis();
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list as T[];
  }

  try {
    let q = query(collection(db, path));

    if (filters) {
      filters.forEach(f => {
        q = query(q, where(f.field, f.operator, f.value));
      });
    }

    if (sortField) {
      q = query(q, orderBy(sortField, sortOrder));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const getDocument = async <T>(path: string, id: string) => {
  if (isMockBypass()) {
    const list = getMockDocuments(path);
    const item = list.find(x => x.id === id);
    return item ? (item as T) : null;
  }

  try {
    const docRef = doc(db, path, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
    return null;
  }
};

export const subscribeToCollection = <T>(
  path: string, 
  callback: (data: T[]) => void,
  filters?: { field: string; operator: WhereFilterOp; value: any }[],
  sortField?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  if (isMockBypass()) {
    const getFilteredSortedData = () => {
      let list = getMockDocuments(path);
      if (filters) {
        list = list.filter(item => {
          return filters.every(f => {
            const itemVal = item[f.field];
            if (f.operator === '==') return itemVal === f.value;
            if (f.operator === '!=') return itemVal !== f.value;
            if (f.operator === '>') return itemVal > f.value;
            if (f.operator === '>=') return itemVal >= f.value;
            if (f.operator === '<') return itemVal < f.value;
            if (f.operator === '<=') return itemVal <= f.value;
            if (f.operator === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(f.value);
            return true;
          });
        });
      }
      if (sortField) {
        list.sort((a, b) => {
          let valA = a[sortField];
          let valB = b[sortField];
          if (valA instanceof Timestamp) valA = valA.toMillis();
          if (valB instanceof Timestamp) valB = valB.toMillis();
          if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
          if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      return list as T[];
    };

    const timeoutId = setTimeout(() => {
      callback(getFilteredSortedData());
    }, 0);

    if (!mockListeners[path]) {
      mockListeners[path] = new Set();
    }
    
    const listenerWrapper = () => {
      callback(getFilteredSortedData());
    };
    
    mockListeners[path].add(listenerWrapper);

    return () => {
      clearTimeout(timeoutId);
      if (mockListeners[path]) {
        mockListeners[path].delete(listenerWrapper);
      }
    };
  }

  let q = query(collection(db, path));

  if (filters) {
    filters.forEach(f => {
      q = query(q, where(f.field, f.operator, f.value));
    });
  }

  if (sortField) {
    q = query(q, orderBy(sortField, sortOrder));
  }

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const createDocument = async <T extends object>(path: string, data: T) => {
  if (isMockBypass()) {
    const list = getMockDocuments(path);
    const newId = `${path.substring(0, 3)}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    const newDoc = {
      id: newId,
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: auth.currentUser?.uid || 'demo-guest-uid-12345',
      updatedBy: auth.currentUser?.uid || 'demo-guest-uid-12345',
    };
    list.push(newDoc);
    saveMockDocuments(path, list);
    notifyMockListeners(path);
    toast.success(`Record created successfully (Local Storage mode)`);
    return newId;
  }

  if (isFirebaseReadOnly) {
    toast.error("The system is running in Read-only Fallback Mode. Write actions are currently disabled.");
    return null;
  }
  try {
    const now = serverTimestamp();
    const docRef = await addDoc(collection(db, path), {
      ...data,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.currentUser?.uid || 'system',
      updatedBy: auth.currentUser?.uid || 'system',
    });

    // Log the creation
    await addDoc(collection(db, 'systemLogs'), {
      operation: 'CREATE',
      collection: path,
      documentId: docRef.id,
      userId: auth.currentUser?.uid || 'system',
      userEmail: auth.currentUser?.email || 'system',
      timestamp: now,
      data: data
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateDocument = async <T extends object>(path: string, id: string, data: Partial<T>) => {
  if (isMockBypass()) {
    const list = getMockDocuments(path);
    const index = list.findIndex(item => item.id === id);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: auth.currentUser?.uid || 'demo-guest-uid-12345'
      };
      saveMockDocuments(path, list);
      notifyMockListeners(path);
      toast.success(`Record updated successfully (Local Storage mode)`);
    }
    return;
  }

  if (isFirebaseReadOnly) {
    toast.error("The system is running in Read-only Fallback Mode. Modification of records is disabled.");
    return;
  }
  try {
    const docRef = doc(db, path, id);
    const now = serverTimestamp();
    
    // 1. Fetch current version for history
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists()) {
      await addDoc(collection(db, 'documentVersions'), {
        originalId: id,
        collection: path,
        data: currentDoc.data(),
        versionedAt: now,
        versionedBy: auth.currentUser?.uid || 'system'
      });
    }

    // 2. Perform update
    await updateDoc(docRef, {
      ...data,
      updatedAt: now,
      updatedBy: auth.currentUser?.uid || 'system',
    });

    // 3. Log the update
    await addDoc(collection(db, 'systemLogs'), {
      operation: 'UPDATE',
      collection: path,
      documentId: id,
      userId: auth.currentUser?.uid || 'system',
      userEmail: auth.currentUser?.email || 'system',
      timestamp: now,
      changes: data
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
};

export const deleteDocument = async (path: string, id: string) => {
  if (isMockBypass()) {
    const list = getMockDocuments(path);
    const filtered = list.filter(item => item.id !== id);
    saveMockDocuments(path, filtered);
    notifyMockListeners(path);
    toast.success(`Record deleted successfully (Local Storage mode)`);
    return;
  }

  if (isFirebaseReadOnly) {
    toast.error("The system is running in Read-only Fallback Mode. Deletion of records is disabled.");
    return;
  }
  try {
    const docRef = doc(db, path, id);
    const now = serverTimestamp();

    // 1. Fetch document before deletion
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists()) {
      // 2. Save to trash for admin restoration
      await addDoc(collection(db, 'trash'), {
        originalId: id,
        originalCollection: path,
        data: currentDoc.data(),
        deletedAt: now,
        deletedBy: auth.currentUser?.uid || 'system',
        deletedByUserEmail: auth.currentUser?.email || 'system'
      });
    }

    // 3. Perform actual deletion (or we could do soft delete, but user asked for a copy to restore)
    await deleteDoc(docRef);

    // 4. Log the deletion
    await addDoc(collection(db, 'systemLogs'), {
      operation: 'DELETE',
      collection: path,
      documentId: id,
      userId: auth.currentUser?.uid || 'system',
      userEmail: auth.currentUser?.email || 'system',
      timestamp: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
};

export const restoreDocument = async (trashId: string) => {
  if (isMockBypass()) {
    toast.success(`Restoring not supported in offline demo mode.`);
    return;
  }

  if (isFirebaseReadOnly) {
    toast.error("The system is running in Read-only Fallback Mode. Restoring deleted records is disabled.");
    return;
  }
  try {
    const trashRef = doc(db, 'trash', trashId);
    const trashDoc = await getDoc(trashRef);
    
    if (!trashDoc.exists()) throw new Error('Trash item not found');
    
    const { originalId, originalCollection, data } = trashDoc.data();
    const now = serverTimestamp();

    // 1. Restore the document
    await addDoc(collection(db, originalCollection), {
      ...data,
      updatedAt: now,
      restoredAt: now,
      restoredBy: auth.currentUser?.uid || 'system'
    });

    // 2. Remove from trash
    await deleteDoc(trashRef);

    // 3. Log the restoration
    await addDoc(collection(db, 'systemLogs'), {
      operation: 'RESTORE',
      collection: originalCollection,
      documentId: originalId,
      userId: auth.currentUser?.uid || 'system',
      userEmail: auth.currentUser?.email || 'system',
      timestamp: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trash/${trashId}`);
  }
};

