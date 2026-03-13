import { describe, it, expect, beforeEach } from 'vitest';
import { UcpSessionManager } from '../session-manager.js';

describe('UcpSessionManager', () => {
  let manager: UcpSessionManager;

  beforeEach(() => {
    manager = new UcpSessionManager();
  });

  it('creates a session with incomplete status', () => {
    const session = manager.createSession('s1', 'cart-1', 'my-store');
    expect(session.cartId).toBe('cart-1');
    expect(session.storeSlug).toBe('my-store');
    expect(session.status).toBe('incomplete');
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.updatedAt).toBeInstanceOf(Date);
  });

  it('retrieves an existing session', () => {
    manager.createSession('s1', 'cart-1', 'my-store');
    const session = manager.getSession('s1');
    expect(session).toBeDefined();
    expect(session!.cartId).toBe('cart-1');
  });

  it('returns undefined for unknown session', () => {
    expect(manager.getSession('unknown')).toBeUndefined();
  });

  it('updates session buyer and fulfillment fields', () => {
    manager.createSession('s1', 'cart-1', 'my-store');
    const updated = manager.updateSession('s1', {
      buyer: { email: 'test@example.com', name: 'John' },
      fulfillmentAddress: {
        line_one: '123 Main St',
        city: 'Oslo',
        country: 'NO',
        postal_code: '0150',
      },
      fulfillmentMethodId: 'ship-1',
    });

    expect(updated).toBeDefined();
    expect(updated!.buyer?.email).toBe('test@example.com');
    expect(updated!.fulfillmentAddress?.city).toBe('Oslo');
    expect(updated!.fulfillmentMethodId).toBe('ship-1');
  });

  it('returns undefined when updating non-existent session', () => {
    expect(manager.updateSession('unknown', { buyer: { email: 'a@b.com' } })).toBeUndefined();
  });

  describe('isReadyForComplete', () => {
    it('returns false when buyer email is missing', () => {
      manager.createSession('s1', 'cart-1', 'store');
      manager.updateSession('s1', {
        fulfillmentAddress: {
          line_one: '123 Main St',
          city: 'Oslo',
          country: 'NO',
          postal_code: '0150',
        },
        fulfillmentMethodId: 'ship-1',
      });
      expect(manager.isReadyForComplete('s1')).toBe(false);
    });

    it('returns false when fulfillment address is missing', () => {
      manager.createSession('s1', 'cart-1', 'store');
      manager.updateSession('s1', {
        buyer: { email: 'test@example.com' },
        fulfillmentMethodId: 'ship-1',
      });
      expect(manager.isReadyForComplete('s1')).toBe(false);
    });

    it('returns false when fulfillment method is missing', () => {
      manager.createSession('s1', 'cart-1', 'store');
      manager.updateSession('s1', {
        buyer: { email: 'test@example.com' },
        fulfillmentAddress: {
          line_one: '123 Main St',
          city: 'Oslo',
          country: 'NO',
          postal_code: '0150',
        },
      });
      expect(manager.isReadyForComplete('s1')).toBe(false);
    });

    it('returns true when all required fields are present', () => {
      manager.createSession('s1', 'cart-1', 'store');
      manager.updateSession('s1', {
        buyer: { email: 'test@example.com' },
        fulfillmentAddress: {
          line_one: '123 Main St',
          city: 'Oslo',
          country: 'NO',
          postal_code: '0150',
        },
        fulfillmentMethodId: 'ship-1',
      });
      expect(manager.isReadyForComplete('s1')).toBe(true);
    });

    it('returns false for unknown session', () => {
      expect(manager.isReadyForComplete('unknown')).toBe(false);
    });
  });

  describe('status transitions', () => {
    it('completes an incomplete session', () => {
      manager.createSession('s1', 'cart-1', 'store');
      const completed = manager.completeSession('s1');
      expect(completed).toBeDefined();
      expect(completed!.status).toBe('completed');
    });

    it('cancels an incomplete session', () => {
      manager.createSession('s1', 'cart-1', 'store');
      const canceled = manager.cancelSession('s1');
      expect(canceled).toBeDefined();
      expect(canceled!.status).toBe('canceled');
    });

    it('cannot complete an already completed session', () => {
      manager.createSession('s1', 'cart-1', 'store');
      manager.completeSession('s1');
      expect(manager.completeSession('s1')).toBeUndefined();
    });

    it('cannot cancel an already completed session', () => {
      manager.createSession('s1', 'cart-1', 'store');
      manager.completeSession('s1');
      expect(manager.cancelSession('s1')).toBeUndefined();
    });

    it('cannot complete a canceled session', () => {
      manager.createSession('s1', 'cart-1', 'store');
      manager.cancelSession('s1');
      expect(manager.completeSession('s1')).toBeUndefined();
    });

    it('cannot cancel an already canceled session', () => {
      manager.createSession('s1', 'cart-1', 'store');
      manager.cancelSession('s1');
      expect(manager.cancelSession('s1')).toBeUndefined();
    });
  });

  it('deletes a session', () => {
    manager.createSession('s1', 'cart-1', 'store');
    expect(manager.deleteSession('s1')).toBe(true);
    expect(manager.getSession('s1')).toBeUndefined();
  });

  it('returns false when deleting unknown session', () => {
    expect(manager.deleteSession('unknown')).toBe(false);
  });

  it('tracks session count', () => {
    expect(manager.getSessionCount()).toBe(0);
    manager.createSession('s1', 'cart-1', 'store');
    manager.createSession('s2', 'cart-2', 'store');
    expect(manager.getSessionCount()).toBe(2);
    manager.deleteSession('s1');
    expect(manager.getSessionCount()).toBe(1);
  });
});
