import type {
  UcpSession,
  UcpSessionStatus,
  UcpBuyerInfo,
  UcpFulfillmentAddress,
} from './types.js';

/**
 * In-memory UCP checkout session manager.
 *
 * Manages checkout session lifecycle: create → update → complete/cancel.
 * Status transitions: incomplete → completed, incomplete → canceled.
 * Terminal statuses (completed, canceled) cannot be changed.
 */
export class UcpSessionManager {
  private readonly sessions = new Map<string, UcpSession>();

  /**
   * Creates a new UCP checkout session.
   */
  createSession(
    sessionId: string,
    cartId: string,
    storeSlug: string,
  ): UcpSession {
    const session: UcpSession = {
      cartId,
      storeSlug,
      status: 'incomplete',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Retrieves a session by ID.
   */
  getSession(sessionId: string): UcpSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Updates a session with partial data. Cannot modify cartId, storeSlug, or createdAt.
   * Returns the updated session, or undefined if not found.
   */
  updateSession(
    sessionId: string,
    data: Partial<{
      status: UcpSessionStatus;
      buyer: UcpBuyerInfo;
      fulfillmentAddress: UcpFulfillmentAddress;
      fulfillmentMethodId: string;
    }>,
  ): UcpSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    Object.assign(session, data, { updatedAt: new Date() });
    return session;
  }

  /**
   * Marks a session as completed. Only works if status is 'incomplete'.
   * Returns the updated session, or undefined if not found or in terminal state.
   */
  completeSession(sessionId: string): UcpSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (session.status === 'completed' || session.status === 'canceled') {
      return undefined;
    }
    session.status = 'completed';
    session.updatedAt = new Date();
    return session;
  }

  /**
   * Marks a session as canceled. Only works if status is 'incomplete'.
   * Returns the updated session, or undefined if not found or in terminal state.
   */
  cancelSession(sessionId: string): UcpSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (session.status === 'completed' || session.status === 'canceled') {
      return undefined;
    }
    session.status = 'canceled';
    session.updatedAt = new Date();
    return session;
  }

  /**
   * Checks whether the session has all required fields for completing checkout.
   * Requires: buyer email + fulfillment address + fulfillment method.
   */
  isReadyForComplete(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    return (
      !!session.buyer?.email &&
      !!session.fulfillmentAddress &&
      !!session.fulfillmentMethodId
    );
  }

  /**
   * Removes a session from the store.
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Returns the number of active sessions.
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}
