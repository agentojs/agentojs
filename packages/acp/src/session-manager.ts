import type {
  AcpSession,
  AcpSessionStatus,
  AcpBuyerInfo,
  AcpFulfillmentAddress,
  AcpPaymentMethod,
} from './types.js';

/**
 * AcpSessionManager — In-memory session store for ACP checkout sessions.
 *
 * Plain class (no framework dependencies). Manages session lifecycle:
 * not_ready_for_payment → ready_for_payment → completed
 * not_ready_for_payment → canceled
 */
export class AcpSessionManager {
  private readonly sessions = new Map<string, AcpSession>();

  createSession(
    checkoutId: string,
    cartId: string,
    storeSlug: string,
  ): AcpSession {
    const session: AcpSession = {
      cartId,
      storeSlug,
      status: 'not_ready_for_payment',
      paymentProvider: {
        provider: 'stripe',
        supported_payment_methods: ['card'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(checkoutId, session);
    return session;
  }

  getSession(checkoutId: string): AcpSession | undefined {
    return this.sessions.get(checkoutId);
  }

  updateSession(
    checkoutId: string,
    data: Partial<
      Pick<
        AcpSession,
        | 'status'
        | 'buyer'
        | 'fulfillmentAddress'
        | 'fulfillmentOptionId'
        | 'paymentProvider'
        | 'paymentMethod'
      >
    >,
  ): AcpSession | undefined {
    const session = this.sessions.get(checkoutId);
    if (!session) return undefined;
    Object.assign(session, data, { updatedAt: new Date() });
    return session;
  }

  /**
   * Recalculates session status based on buyer/fulfillment completeness.
   * Returns the new status, or undefined if session not found.
   */
  recalculateStatus(checkoutId: string): AcpSessionStatus | undefined {
    const session = this.sessions.get(checkoutId);
    if (!session) return undefined;

    // Don't change terminal statuses
    if (session.status === 'completed' || session.status === 'canceled') {
      return session.status;
    }

    const hasEmail = !!session.buyer?.email;
    const hasAddress = !!session.fulfillmentAddress;
    const hasShipping = !!session.fulfillmentOptionId;

    const newStatus: AcpSessionStatus =
      hasEmail && hasAddress && hasShipping
        ? 'ready_for_payment'
        : 'not_ready_for_payment';

    session.status = newStatus;
    session.updatedAt = new Date();
    return newStatus;
  }

  /**
   * Marks a session as completed.
   */
  completeSession(checkoutId: string): AcpSession | undefined {
    const session = this.sessions.get(checkoutId);
    if (!session) return undefined;
    session.status = 'completed';
    session.updatedAt = new Date();
    return session;
  }

  /**
   * Marks a session as canceled.
   */
  cancelSession(checkoutId: string): AcpSession | undefined {
    const session = this.sessions.get(checkoutId);
    if (!session) return undefined;
    if (session.status === 'completed') return undefined; // Can't cancel completed
    session.status = 'canceled';
    session.updatedAt = new Date();
    return session;
  }

  /**
   * Finds a session by its Stripe PaymentIntent ID.
   */
  findByPaymentIntentId(
    paymentIntentId: string,
  ): { id: string; session: AcpSession } | undefined {
    for (const [id, session] of this.sessions.entries()) {
      if (session.paymentMethod?.payment_intent_id === paymentIntentId) {
        return { id, session };
      }
    }
    return undefined;
  }

  deleteSession(checkoutId: string): boolean {
    return this.sessions.delete(checkoutId);
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}
