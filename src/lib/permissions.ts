import { UserRole } from './constants';

export enum Permission {
  VIEW_LEADS = 'VIEW_LEADS',
  CREATE_LEADS = 'CREATE_LEADS',
  EDIT_LEADS = 'EDIT_LEADS',
  DELETE_LEADS = 'DELETE_LEADS',
  VIEW_QUOTES = 'VIEW_QUOTES',
  CREATE_QUOTES = 'CREATE_QUOTES',
  VIEW_ORDERS = 'VIEW_ORDERS',
  CREATE_ORDERS = 'CREATE_ORDERS',
  VIEW_SHIPMENTS = 'VIEW_SHIPMENTS',
  MANAGE_SHIPMENTS = 'MANAGE_SHIPMENTS',
  VIEW_FINANCE = 'VIEW_FINANCE',
  MANAGE_FINANCE = 'MANAGE_FINANCE',
  VIEW_REPORTS = 'VIEW_REPORTS',
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_AUDIT = 'VIEW_AUDIT',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  VIEW_INVENTORY = 'VIEW_INVENTORY',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
  MANAGE_DOCUMENTS = 'MANAGE_DOCUMENTS',
}

const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.MANAGER]: [
    Permission.VIEW_LEADS, Permission.CREATE_LEADS, Permission.EDIT_LEADS,
    Permission.VIEW_QUOTES, Permission.CREATE_QUOTES,
    Permission.VIEW_ORDERS, Permission.CREATE_ORDERS,
    Permission.VIEW_SHIPMENTS, Permission.MANAGE_SHIPMENTS,
    Permission.VIEW_FINANCE, Permission.VIEW_REPORTS,
    Permission.VIEW_INVENTORY, Permission.VIEW_DOCUMENTS,
  ],
  [UserRole.SALES_REP]: [
    Permission.VIEW_LEADS, Permission.CREATE_LEADS, Permission.EDIT_LEADS,
    Permission.VIEW_QUOTES, Permission.CREATE_QUOTES,
    Permission.VIEW_ORDERS,
  ],
  [UserRole.LOGISTICS]: [
    Permission.VIEW_ORDERS, Permission.VIEW_SHIPMENTS, Permission.MANAGE_SHIPMENTS,
    Permission.VIEW_INVENTORY, Permission.VIEW_DOCUMENTS,
  ],
  [UserRole.FINANCE]: [
    Permission.VIEW_FINANCE, Permission.MANAGE_FINANCE, Permission.VIEW_REPORTS,
    Permission.VIEW_ORDERS,
  ],
  [UserRole.VIEWER]: [
    Permission.VIEW_LEADS, Permission.VIEW_QUOTES, Permission.VIEW_ORDERS,
    Permission.VIEW_SHIPMENTS, Permission.VIEW_REPORTS,
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
