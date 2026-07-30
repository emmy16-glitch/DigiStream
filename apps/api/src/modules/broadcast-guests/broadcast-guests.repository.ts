import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import {
  broadcastCallInRequests,
  broadcastGuestInvitations,
  type BroadcastCallInRequestRecord,
  type BroadcastGuestInvitationRecord,
} from './broadcast-guests.schema.js';

export async function createGuestInvitationRecord(
  db: DigiStreamDatabase,
  input: {
    organisationId: string;
    broadcastId: string;
    createdByUserId: string;
    invitedEmail: string | null;
    displayName: string | null;
    tokenHash: string;
    expiresAt: Date;
  },
): Promise<BroadcastGuestInvitationRecord> {
  const [record] = await db
    .insert(broadcastGuestInvitations)
    .values(input)
    .returning();
  if (!record) throw new Error('Guest invitation insertion returned no row.');
  return record;
}

export async function listGuestInvitationRecords(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
): Promise<BroadcastGuestInvitationRecord[]> {
  return db
    .select()
    .from(broadcastGuestInvitations)
    .where(
      and(
        eq(broadcastGuestInvitations.organisationId, organisationId),
        eq(broadcastGuestInvitations.broadcastId, broadcastId),
      ),
    )
    .orderBy(desc(broadcastGuestInvitations.createdAt));
}

export async function findGuestInvitationRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  invitationId: string,
): Promise<BroadcastGuestInvitationRecord | null> {
  const [record] = await db
    .select()
    .from(broadcastGuestInvitations)
    .where(
      and(
        eq(broadcastGuestInvitations.id, invitationId),
        eq(broadcastGuestInvitations.organisationId, organisationId),
        eq(broadcastGuestInvitations.broadcastId, broadcastId),
      ),
    )
    .limit(1);
  return record ?? null;
}

export async function findGuestInvitationByTokenHash(
  db: DigiStreamDatabase,
  tokenHash: string,
): Promise<BroadcastGuestInvitationRecord | null> {
  const [record] = await db
    .select()
    .from(broadcastGuestInvitations)
    .where(eq(broadcastGuestInvitations.tokenHash, tokenHash))
    .limit(1);
  return record ?? null;
}

export async function acceptGuestInvitationRecord(
  db: DigiStreamDatabase,
  invitationId: string,
  displayName: string,
  sessionTokenHash: string,
  sessionExpiresAt: Date,
): Promise<BroadcastGuestInvitationRecord | null> {
  const now = new Date();
  const [record] = await db
    .update(broadcastGuestInvitations)
    .set({
      displayName,
      status: 'accepted',
      acceptedAt: now,
      sessionTokenHash,
      sessionExpiresAt,
      updatedAt: now,
    })
    .where(
      and(
        eq(broadcastGuestInvitations.id, invitationId),
        eq(broadcastGuestInvitations.status, 'pending'),
        isNull(broadcastGuestInvitations.acceptedAt),
        isNull(broadcastGuestInvitations.revokedAt),
      ),
    )
    .returning();
  return record ?? null;
}

export async function admitGuestInvitationRecord(
  db: DigiStreamDatabase,
  invitationId: string,
): Promise<BroadcastGuestInvitationRecord | null> {
  const now = new Date();
  const [record] = await db
    .update(broadcastGuestInvitations)
    .set({ status: 'admitted', admittedAt: now, updatedAt: now })
    .where(
      and(
        eq(broadcastGuestInvitations.id, invitationId),
        eq(broadcastGuestInvitations.status, 'accepted'),
        isNull(broadcastGuestInvitations.revokedAt),
      ),
    )
    .returning();
  return record ?? null;
}

export async function revokeGuestInvitationRecord(
  db: DigiStreamDatabase,
  invitationId: string,
): Promise<BroadcastGuestInvitationRecord | null> {
  const now = new Date();
  const [record] = await db
    .update(broadcastGuestInvitations)
    .set({ status: 'revoked', revokedAt: now, updatedAt: now })
    .where(
      and(
        eq(broadcastGuestInvitations.id, invitationId),
        isNull(broadcastGuestInvitations.revokedAt),
      ),
    )
    .returning();
  return record ?? null;
}

export async function findGuestSessionRecord(
  db: DigiStreamDatabase,
  sessionTokenHash: string,
): Promise<BroadcastGuestInvitationRecord | null> {
  const [record] = await db
    .select()
    .from(broadcastGuestInvitations)
    .where(eq(broadcastGuestInvitations.sessionTokenHash, sessionTokenHash))
    .limit(1);
  return record ?? null;
}

export async function createCallInRequestRecord(
  db: DigiStreamDatabase,
  input: {
    organisationId: string;
    broadcastId: string;
    displayName: string;
    contactEmail: string | null;
    message: string | null;
  },
): Promise<BroadcastCallInRequestRecord> {
  const [record] = await db
    .insert(broadcastCallInRequests)
    .values(input)
    .returning();
  if (!record) throw new Error('Call-in request insertion returned no row.');
  return record;
}

export async function listCallInRequestRecords(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
): Promise<BroadcastCallInRequestRecord[]> {
  return db
    .select()
    .from(broadcastCallInRequests)
    .where(
      and(
        eq(broadcastCallInRequests.organisationId, organisationId),
        eq(broadcastCallInRequests.broadcastId, broadcastId),
      ),
    )
    .orderBy(asc(broadcastCallInRequests.createdAt));
}

export async function findCallInRequestRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  callInId: string,
): Promise<BroadcastCallInRequestRecord | null> {
  const [record] = await db
    .select()
    .from(broadcastCallInRequests)
    .where(
      and(
        eq(broadcastCallInRequests.id, callInId),
        eq(broadcastCallInRequests.organisationId, organisationId),
        eq(broadcastCallInRequests.broadcastId, broadcastId),
      ),
    )
    .limit(1);
  return record ?? null;
}

export async function decideCallInRequestRecord(
  db: DigiStreamDatabase,
  callInId: string,
  status: 'approved' | 'rejected',
  decidedByUserId: string,
  invitationId: string | null,
): Promise<BroadcastCallInRequestRecord | null> {
  const now = new Date();
  const [record] = await db
    .update(broadcastCallInRequests)
    .set({
      status,
      invitationId,
      decidedByUserId,
      decidedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(broadcastCallInRequests.id, callInId),
        eq(broadcastCallInRequests.status, 'pending'),
      ),
    )
    .returning();
  return record ?? null;
}
