import { StaffRole, WorkerPosition } from '@prisma/client';

export type AuthKind = 'STAFF' | 'WORKER';

export interface AuthPayload {
  sub: string;
  kind: AuthKind;
  role?: StaffRole;
  /** Workers only. Read from the database on every request, never from the token. */
  position?: WorkerPosition;
  fullName: string;
  mustChangePassword?: boolean;
  mustChangePin?: boolean;
  tokenVersion: number;
}
