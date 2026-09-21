/**
 * Role-based access control.
 *
 * ADMIN   — everything, including user and role management.
 * MANAGER — whole catalogue, rental offers, every lead.
 * SALES   — own listings (create/edit/status), every lead they are assigned or unassigned.
 * VIEWER  — read-only.
 */

export const ROLE_KEYS = ["ADMIN", "MANAGER", "SALES", "VIEWER"] as const;
export type Role = (typeof ROLE_KEYS)[number];

export type Permission =
  | "admin.access"
  | "vehicle.read"
  | "vehicle.create"
  | "vehicle.update.any"
  | "vehicle.update.own"
  | "vehicle.delete"
  | "vehicle.publish"
  | "vehicle.status" // set AVAILABLE / RESERVED / SOLD badges
  | "rental.manage"
  | "lead.read"
  | "lead.update"
  | "lead.delete"
  | "user.read"
  | "user.manage"
  | "activity.read"
  | "settings.manage";

const MATRIX: Record<Role, Permission[]> = {
  ADMIN: [
    "admin.access", "vehicle.read", "vehicle.create", "vehicle.update.any", "vehicle.update.own",
    "vehicle.delete", "vehicle.publish", "vehicle.status", "rental.manage",
    "lead.read", "lead.update", "lead.delete",
    "user.read", "user.manage", "activity.read", "settings.manage",
  ],
  MANAGER: [
    "admin.access", "vehicle.read", "vehicle.create", "vehicle.update.any", "vehicle.update.own",
    "vehicle.delete", "vehicle.publish", "vehicle.status", "rental.manage",
    "lead.read", "lead.update", "user.read", "activity.read",
  ],
  SALES: [
    "admin.access", "vehicle.read", "vehicle.create", "vehicle.update.own",
    "vehicle.publish", "vehicle.status", "rental.manage",
    "lead.read", "lead.update",
  ],
  VIEWER: ["admin.access", "vehicle.read", "lead.read"],
};

export function isRole(value: string | null | undefined): value is Role {
  return !!value && (ROLE_KEYS as readonly string[]).includes(value);
}

export function can(role: string | null | undefined, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return MATRIX[role].includes(permission);
}

/** Can this user edit (or delete) a specific vehicle? */
export function canEditVehicle(
  user: { id: string; role: string } | null,
  vehicle: { ownerId: string | null },
): boolean {
  if (!user) return false;
  if (can(user.role, "vehicle.update.any")) return true;
  if (!can(user.role, "vehicle.update.own")) return false;
  return vehicle.ownerId === user.id || vehicle.ownerId === null;
}

export function canDeleteVehicle(user: { id: string; role: string } | null): boolean {
  return can(user?.role, "vehicle.delete");
}

export function permissionsOf(role: string | null | undefined): Permission[] {
  return isRole(role) ? MATRIX[role] : [];
}
