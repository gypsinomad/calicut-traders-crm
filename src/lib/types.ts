import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'manager' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Timestamp;
  avatarUrl?: string;
  organization?: string;
  onboardingCompleted?: boolean;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'quoted' | 'converted' | 'lost';
export type LeadPriority = 'hot' | 'warm' | 'cold';
export type LeadSource = 'manual' | 'website' | 'whatsapp' | 'tradeShow' | 'referral';

export interface Lead {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  createdAt: Timestamp;
  assignedUserId: string;
  productInterest: string;
  destinationCountry: string;
  incotermsPreference: string;
  priority?: LeadPriority;
  nextFollowUpAt?: Timestamp;
  lastContactAt?: Timestamp;
  whatsappNumber?: string;
  whatsappThreadId?: string;
  organization?: string;
  riskScore?: 'low' | 'medium' | 'high';
  riskExplanation?: string;
}

export type OrderStage = 
  | 'leadReceived' 
  | 'quotationSent' 
  | 'orderConfirmed' 
  | 'exportDocumentation' 
  | 'shipmentReady' 
  | 'shippedDelivered' 
  | 'cancelled';

export interface ExportOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  title: string;
  commodity: string;
  quantity: number;
  unit: string;
  stage: OrderStage;
  status: string;
  totalAmount: number;
  totalValue: number;
  destination: string;
  destinationCountry: string;
  createdAt: Timestamp;
  assignedUserId: string;
  companyId: string;
  contactId: string;
  currency: string;
  incoterms: string;
  paymentTerms: string;
  productType: string;
  docsCompleted: number;
  docsTotal: number;
  items: any[];
  documents: any[];
  iceGateStatus?: string;
  etd?: Timestamp;
  eta?: Timestamp;
  paymentDueDate?: Timestamp;
  complianceRiskLevel?: string;
  hsCode?: string;
  containerType?: string;
  fssaiNumber?: string;
  certificateRequirements?: string[];
  activityLog?: ActivityLogEntry[];
  organization?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  transportMode?: 'sea' | 'air' | 'road' | 'rail';
  shipmentStatus?: string;
  originPort?: string;
  destinationPort?: string;
  containerNumber?: string;
  carbonFootprint?: number;
  riskScore?: number;
  complianceAI?: {
    status: 'verified' | 'flagged' | 'incomplete';
    score: number;
    missingDocs: string[];
    recommendations: string[];
    lastChecked: Timestamp;
  };
  logisticsAI?: {
    route: string;
    transitTime: string;
    riskLevel: 'low' | 'medium' | 'high';
    tips: string[];
    lastOptimized: Timestamp;
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: Timestamp;
  reorderLevel: number;
  batchNumber: string;
  category: string;
  organization: string;
  createdAt: Timestamp;
  prediction?: {
    stockOutDate: Timestamp;
    predictedDays: number;
    confidence: number;
    reasoning: string;
  };
}

export interface MarketPrice {
  id: string;
  spice: string;
  commodity: string;
  region: string;
  price: number;
  currency: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  timestamp: Timestamp;
  prediction?: {
    trend: 'up' | 'down' | 'stable';
    confidence: number;
    reasoning: string;
  };
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  certificates: string[];
  compliance: string[];
  organization: string;
  createdAt: Timestamp;
  rating: number; // 1-5
  riskScore: number; // 0-100
  category: string;
  location: string;
  status?: 'active' | 'inactive' | 'pending' | 'onboarding';
  onboardingStep?: string;
  riskAnalysis?: {
    score: number;
    level: 'low' | 'medium' | 'high';
    keyRisks: string[];
    lastAnalyzed: Timestamp;
  };
}

export interface ActivityLogEntry {
  id: string;
  type: 'statusChange' | 'comment' | 'documentUpload' | 'milestone' | 'audit';
  content: string;
  userId: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  organization: string;
}

export interface SystemHealth {
  id: string;
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  lastChecked: Timestamp;
  message?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  leadId: string;
  companyId: string;
  companyName?: string;
  destinationCountry?: string;
  items: QuoteItem[];
  totalAmount: number;
  currency: string;
  validUntil: Timestamp;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  createdAt: Timestamp;
  createdBy: string;
  organization: string;
}

export interface QuoteItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  aiSuggestion?: {
    suggestedPrice: number;
    confidence: number;
    reasoning: string;
  };
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  method: 'bankTransfer' | 'creditCard' | 'letterOfCredit' | 'other';
  transactionId?: string;
  paidAt?: Timestamp;
  dueDate: Timestamp;
  organization: string;
  riskAI?: {
    riskLevel: 'low' | 'medium' | 'high';
    score: number;
    keyRisks: string[];
    recommendation: string;
    lastAnalyzed: Timestamp;
  };
}

export interface ShipmentException {
  id: string;
  orderId: string;
  type: 'delay' | 'damage' | 'customsHold' | 'documentationError' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  reportedAt: Timestamp;
  resolvedAt?: Timestamp;
  reportedBy: string;
  organization: string;
  resolutionAI?: {
    steps: string[];
    estimatedTime: string;
    priority: 'low' | 'medium' | 'high';
    summary: string;
    lastGenerated: Timestamp;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Timestamp;
  read: boolean;
  userId: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export type DocType = 
  | 'proformaInvoice' 
  | 'commercialInvoice' 
  | 'contract' 
  | 'packingList' 
  | 'billOfLading' 
  | 'coo' 
  | 'fssai' 
  | 'apeda' 
  | 'phytoCertificate'
  | 'invoice'
  | 'certificate_of_origin'
  | 'phytosanitary'
  | 'other';

export interface Document {
  id: string;
  name: string;
  type: DocType;
  url: string;
  fileUrl: string;
  status: 'pending' | 'uploaded' | 'verified' | 'finalized' | 'rejected';
  uploadedAt: Timestamp;
  uploadedBy: string;
  relatedOrderId?: string;
  relatedLeadId?: string;
  organization?: string;
  size?: number;
  analysisAI?: {
    complianceStatus: 'verified' | 'flagged' | 'incomplete';
    score: number;
    keyFindings: string[];
    summary: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'inProgress' | 'done' | 'pending';
  priority: 'low' | 'medium' | 'high';
  dueDate: Timestamp;
  assigneeId: string;
  createdAt: Timestamp;
  relatedLeadId?: string;
  relatedOrderId?: string;
  organization?: string;
}

export interface Company {
  id: string;
  legalName: string;
  displayName: string;
  type: 'customer' | 'supplier' | 'partner' | 'agent';
  address: {
    line1: string;
    line2?: string;
    street?: string;
    city: string;
    state: string;
    pinCode: string;
    postalCode?: string;
    country: string;
  };
  email: string;
  phone: string;
  website?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  compliance?: {
    gstin: string;
    iec: string;
    pan: string;
    apedaReg?: string;
    fssaiNumber?: string;
  };
  organization?: string;
}
