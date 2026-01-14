/**
 * Utility for storing and retrieving pending group invites
 * Used to persist invite code through the authentication flow
 */

const PENDING_INVITE_KEY = "pending-group-invite";

export interface PendingInvite {
  inviteCode: string;
  groupId?: string;
  groupName?: string;
  createdAt: number;
}

/**
 * Store a pending invite in localStorage
 */
export function storePendingInvite(invite: Omit<PendingInvite, "createdAt">): void {
  if (typeof window === "undefined") return;

  const pendingInvite: PendingInvite = {
    ...invite,
    createdAt: Date.now(),
  };

  localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(pendingInvite));
}

/**
 * Retrieve and clear the pending invite from localStorage
 * Returns null if no pending invite or if it's expired (24 hours)
 */
export function getPendingInvite(): PendingInvite | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(PENDING_INVITE_KEY);
  if (!stored) return null;

  try {
    const invite: PendingInvite = JSON.parse(stored);

    // Check if expired (24 hours)
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - invite.createdAt > expirationTime) {
      clearPendingInvite();
      return null;
    }

    return invite;
  } catch {
    clearPendingInvite();
    return null;
  }
}

/**
 * Clear the pending invite from localStorage
 */
export function clearPendingInvite(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_INVITE_KEY);
}

/**
 * Check if there's a valid pending invite
 */
export function hasPendingInvite(): boolean {
  return getPendingInvite() !== null;
}
