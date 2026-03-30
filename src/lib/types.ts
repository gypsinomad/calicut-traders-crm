import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'manager' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  lastActive?: Timestamp;
  createdAt: Timestamp;
  avatarUrl?: string;
  organization?: string;
  onboardingCompleted?: boolean;
  isApproved?: boolean;
}

export type LeadStatus = 'lead' | 'contacted' | 'sampleSent' | 'negotiation' | 'orderConfirmed' | 'repeatBuyer' | 'lost' | 'new' | 'qualified' | 'quoted' | 'converted';
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
  smartScore?: number;
  smartScoreExplanation?: string;
  activityLog?: {
    type: 'call' | 'email' | 'whatsapp' | 'meeting';
    note: string;
    timestamp: Timestamp;
    performedBy: string;
  }[];
  scorecard?: {
    paymentReliability: number; // 1-5
    orderFrequency: number; // 1-5
    orderSize: number; // 1-5
    totalScore: number;
  };
  lastContactDate?: Timestamp;
  preferredProducts?: string[];
  totalOrders?: number;
  totalValue?: number;
  productCategories?: string;
}

export type OrderStage = 
  | 'inquiry'
  | 'quotationSent'
  | 'piIssued'
  | 'orderConfirmed'
  | 'production'
  | 'customs'
  | 'shipped'
  | 'inTransit'
  | 'delivered'
  | 'paymentReceived'
  | 'cancelled'
  | 'draft'
  | 'leadReceived'
  | 'exportDocumentation'
  | 'shipmentReady'
  | 'shippedDelivered';

export type PaymentTerm = 'LC' | 'TT' | 'DP' | 'DA';

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
  paymentTerms: PaymentTerm;
  productType: string;
  docsCompleted: number;
  docsTotal: number;
  items: any[];
  documents: any[];
  documentChecklist?: Record<string, boolean>;
  financials?: {
    cogs: number;
    packingCost: number;
    inlandFreight: number;
    terminalCharges: number;
    oceanFreight: number;
    insurance: number;
    bankCharges: number;
    customsCharges: number;
    otherCosts: number;
    totalCost: number;
    netProfit: number;
    margin: number;
  };
  containerNumber?: string;
  vesselName?: string;
  etd?: Timestamp;
  eta?: Timestamp;
  paymentDueDate?: Timestamp;
  organization?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  carbonFootprint?: number;
  containerType?: string;
  shipmentStatus?: string;
  originPort?: string;
  destinationPort?: string;
  updatedAt?: Timestamp;
  logisticsAI?: any;
  complianceAI?: any;
  transportMode?: string;
  hsCode?: string;
  riskScore?: number;
  certificates?: {
    id: string;
    type: string;
    number: string;
    expiryDate: Timestamp;
    status: 'valid' | 'expiring' | 'expired';
  }[];
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
  certifications?: string[];
  labReportUrl?: string;
  origin?: string;
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
  product: string;
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
  completedSteps?: string[];
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
  leadId?: string;
  companyId?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  destinationCountry?: string;
  items: QuoteItem[];
  subtotal: number;
  freightEstimate: number;
  insurance: number;
  totalAmount: number;
  currency: string;
  incoterms: string;
  paymentTerms: string;
  packaging: string;
  portOfLoading: string;
  validUntil: Timestamp;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  createdAt: Timestamp;
  createdBy: string;
  organization: string;
  specialNotes?: string;
  sentAt?: Timestamp;
  sentVia?: 'email' | 'whatsapp';
  orderId?: string;
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
  organization: string;
}

export type DocType = 
  | 'proformaInvoice' 
  | 'commercialInvoice' 
  | 'packingList' 
  | 'billOfLading' 
  | 'certificateOfOrigin' 
  | 'phytosanitaryCertificate' 
  | 'fssaiDeclaration' 
  | 'shippingBill' 
  | 'gstInvoice' 
  | 'lcUtilization' 
  | 'qualityCertificate' 
  | 'fumigationCertificate'
  | 'contract'
  | 'apeda'
  | 'other';

export interface GeneratedDocument {
  id: string;
  orderId: string;
  documentType: DocType;
  generatedAt: Timestamp;
  generatedBy: string;
  htmlContent: string;
  status: 'draft' | 'finalized';
  organization: string;
}

export interface SendHistory {
  id: string;
  documentId?: string;
  quoteId?: string;
  sentTo: string;
  sentVia: 'email' | 'whatsapp';
  sentAt: Timestamp;
  sentBy: string;
  messageBody: string;
  organization: string;
}

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

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Timestamp;
  end: Timestamp;
  type: 'meeting' | 'deadline' | 'reminder' | 'compliance' | 'other';
  isCommon: boolean;
  userId: string;
  organization: string;
  createdAt: Timestamp;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  timestamp: Timestamp;
  organization: string;
  channelId?: string;
}

export interface DailyObjective {
  id: string;
  userId: string;
  userName: string;
  date: string;
  objectives: {
    text: string;
    completed: boolean;
  }[];
  organization: string;
  updatedAt: Timestamp;
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

export interface AuditTrail {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Timestamp;
  organization: string;
  details?: string;
}

// Communications Hub Types
export type CommunicationChannel = 'email' | 'whatsapp' | 'facebook' | 'instagram' | 'linkedin' | 'twitter';

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  timestamp: Timestamp;
  status: 'sent' | 'received' | 'draft';
  attachments?: { name: string; url: string; size: number }[];
  relatedOrderId?: string;
  relatedLeadId?: string;
  organization: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: Timestamp;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'template' | 'image' | 'document';
  templateName?: string;
  relatedOrderId?: string;
  relatedLeadId?: string;
  organization: string;
}

export interface SocialPost {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  content: string;
  mediaUrls?: string[];
  scheduledAt: Timestamp;
  publishedAt?: Timestamp;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  analytics?: {
    reach: number;
    engagement: number;
    impressions: number;
    clicks: number;
  };
  organization: string;
}

export interface UnifiedMessage {
  id: string;
  channel: CommunicationChannel;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
  content: string;
  timestamp: Timestamp;
  status: 'unread' | 'read' | 'pending' | 'resolved';
  assignedTo?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'lead' | 'order' | 'company';
  organization: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: any[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  organization: string;
}

export interface IntegrationConfig {
  id: string;
  platform: 'zoho_mail' | 'whatsapp' | 'meta' | 'zoho_social';
  isConnected: boolean;
  lastSyncAt?: Timestamp;
  config: Record<string, any>;
  organization: string;
}
