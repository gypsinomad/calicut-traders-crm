import { UserRole } from './types';

export type Permission = 
  | 'sales.read'
  | 'sales.write'
  | 'operations.read'
  | 'operations.write'
  | 'communication.read'
  | 'communication.write'
  | 'intelligence.read'
  | 'intelligence.write'
  | 'finance.read'
  | 'finance.write'
  | 'approvals.manage'
  | 'users.read'
  | 'users.write'
  | 'settings.general.write'
  | 'settings.security.write'
  | 'settings.integrations.write'
  | 'settings.automation.write'
  | 'settings.ai.write'
  | 'settings.data.write'
  | 'audit.read'
  | 'health.read'
  | 'roles.assign'
  | 'rules.manage';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'sales.read', 'sales.write',
    'operations.read', 'operations.write',
    'communication.read', 'communication.write',
    'intelligence.read', 'intelligence.write',
    'finance.read', 'finance.write',
    'approvals.manage',
    'users.read', 'users.write',
    'settings.general.write', 'settings.security.write', 'settings.integrations.write', 'settings.automation.write', 'settings.ai.write', 'settings.data.write',
    'audit.read', 'health.read',
    'roles.assign', 'rules.manage'
  ],
  partner: [
    'sales.read', 'sales.write',
    'operations.read', 'operations.write',
    'communication.read', 'communication.write',
    'intelligence.read', 'intelligence.write',
    'finance.read', 'finance.write',
    'approvals.manage'
  ],
  manager: [
    'sales.read', 'sales.write',
    'operations.read', 'operations.write',
    'communication.read', 'communication.write',
    'intelligence.read',
    'finance.read',
    'approvals.manage'
  ],
  standard: [
    'sales.read', 'sales.write',
    'operations.read', 'operations.write',
    'communication.read', 'communication.write'
  ]
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export function hasAnyRole(currentRole: UserRole | undefined, roles: UserRole[]): boolean {
  if (!currentRole) return false;
  return roles.includes(currentRole);
}

export function canApprove(role: UserRole | undefined): boolean {
  return hasPermission(role, 'approvals.manage');
}

export function isStandard(role: UserRole | undefined): boolean {
  return role === 'standard';
}

export function isManager(role: UserRole | undefined): boolean {
  return role === 'manager';
}

export function isPartner(role: UserRole | undefined): boolean {
  return role === 'partner';
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin';
}

export function getRoleHierarchy(role: UserRole | undefined): number {
  switch (role) {
    case 'admin': return 4;
    case 'partner': return 3;
    case 'manager': return 2;
    case 'standard': return 1;
    default: return 0;
  }
}

export function canManageUsers(role: UserRole | undefined): boolean {
  return hasPermission(role, 'users.write');
}
