/**
 * Application-wide constants
 */

export const APP_NAME = 'Calicut Traders CRM';
export const DEFAULT_ORGANIZATION = 'Calicut Traders';
export const ADMIN_EMAIL = 'akhilvenugopal@gmail.com';

export enum UserRole {
  ADMIN = 'admin',
  PARTNER = 'partner',
  MANAGER = 'manager',
  STANDARD = 'standard',
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export enum FirestoreOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const ROUTES = {
  DASHBOARD: '/',
  LEADS: '/leads',
  PROSPECTING: '/prospecting',
  SIGNALS: '/signals',
  QUOTES: '/quotes',
  PIPELINE: '/pipeline',
  BUYER_PIPELINE: '/buyer-pipeline',
  COMPANIES: '/companies',
  ORDERS: '/orders',
  EXECUTION: '/execution',
  TRACKER: '/shipment-tracker',
  INVENTORY: '/inventory',
  PROCUREMENT: '/procurement',
  SUPPLIERS: '/suppliers',
  MARKET: '/market',
  ANALYTICS: '/analytics',
  REPORTS: '/reports',
  SCANNER: '/scanner',
  COMMUNICATIONS: '/communications',
  COLLABORATION: '/collaboration',
  CALENDAR: '/calendar',
  TASKS: '/tasks',
  WORKFLOWS: '/workflows',
  FINANCE: '/finance',
  PAYMENTS: '/payments',
  EXCEPTIONS: '/exceptions',
  DOCUMENTS: '/documents',
  DOC_MANAGER: '/documents-manager',
  USERS: '/users',
  AUDIT: '/audit',
  HEALTH: '/health',
  SETTINGS: '/settings',
  CUSTOMER_PORTAL: '/customer-portal',
  AI_USAGE: '/ai-usage',
};
