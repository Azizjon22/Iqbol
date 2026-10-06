import { StaffRole } from '@prisma/client';

export type AuthKind = 'STAFF' | 'WORKER';

export interface AuthPayload {
  sub: string;
  kind: AuthKind;
  role?: StaffRole;
  fullName: string;
  mustChangePassword?: boolean;
  mustChangePin?: boolean;
  /** Must match the account's current value, or the token is dead. */
  tokenVersion: number;
}
