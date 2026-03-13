import { describe, it, expect, beforeEach } from 'vitest';
import { AcpSessionManager } from '../session-manager.js';

describe('AcpSessionManager', () => {
  let manager: AcpSessionManager;

  beforeEach(() => {
    manager = new AcpSessionManager();
  });

  describe('createSession', () => {
    it('creates a session with not_ready_for_payment status', () => {
      const session = manager.createSession('checkout-1', 'cart-1', 'test-store');
      expect(session.status).toBe('not_ready_for_payment');
      expect(session.cartId).toBe('cart-1');
      expect(session.storeSlug).toBe('test-store');
      expect(session.paymentProvider.provider).toBe('stripe');
      expect(session.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getSession', () => {
    it('returns session by ID', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      const session = manager.getSession('checkout-1');
      expect(session).toBeDefined();
      expect(session!.cartId).toBe('cart-1');
    });

    it('returns undefined for unknown ID', () => {
      expect(manager.getSession('unknown')).toBeUndefined();
    });
  });

  describe('updateSession', () => {
    it('updates session fields', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      const updated = manager.updateSession('checkout-1', {
        buyer: { email: 'test@test.com', name: 'Test User' },
      });
      expect(updated?.buyer?.email).toBe('test@test.com');
    });

    it('returns undefined for unknown session', () => {
      expect(manager.updateSession('unknown', { buyer: { email: 'x' } })).toBeUndefined();
    });
  });

  describe('recalculateStatus', () => {
    it('stays not_ready_for_payment when incomplete', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      manager.updateSession('checkout-1', {
        buyer: { email: 'test@test.com' },
      });
      const status = manager.recalculateStatus('checkout-1');
      expect(status).toBe('not_ready_for_payment');
    });

    it('becomes ready_for_payment when buyer + address + shipping set', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      manager.updateSession('checkout-1', {
        buyer: { email: 'test@test.com' },
        fulfillmentAddress: {
          line_one: '123 Main St',
          city: 'NYC',
          country: 'US',
          postal_code: '10001',
        },
        fulfillmentOptionId: 'shipping-1',
      });
      const status = manager.recalculateStatus('checkout-1');
      expect(status).toBe('ready_for_payment');
    });

    it('does not change completed status', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      manager.completeSession('checkout-1');
      const status = manager.recalculateStatus('checkout-1');
      expect(status).toBe('completed');
    });

    it('does not change canceled status', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      manager.cancelSession('checkout-1');
      const status = manager.recalculateStatus('checkout-1');
      expect(status).toBe('canceled');
    });

    it('returns undefined for unknown session', () => {
      expect(manager.recalculateStatus('unknown')).toBeUndefined();
    });
  });

  describe('completeSession', () => {
    it('marks session as completed', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      const session = manager.completeSession('checkout-1');
      expect(session?.status).toBe('completed');
    });

    it('returns undefined for unknown session', () => {
      expect(manager.completeSession('unknown')).toBeUndefined();
    });
  });

  describe('cancelSession', () => {
    it('marks session as canceled', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      const session = manager.cancelSession('checkout-1');
      expect(session?.status).toBe('canceled');
    });

    it('cannot cancel a completed session', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      manager.completeSession('checkout-1');
      expect(manager.cancelSession('checkout-1')).toBeUndefined();
    });
  });

  describe('findByPaymentIntentId', () => {
    it('finds session by payment intent ID', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      manager.updateSession('checkout-1', {
        paymentMethod: {
          type: 'card',
          payment_intent_id: 'pi_123',
          client_secret: 'secret',
          publishable_key: 'pk_test',
        },
      });
      const result = manager.findByPaymentIntentId('pi_123');
      expect(result).toBeDefined();
      expect(result!.id).toBe('checkout-1');
      expect(result!.session.cartId).toBe('cart-1');
    });

    it('returns undefined when not found', () => {
      expect(manager.findByPaymentIntentId('pi_unknown')).toBeUndefined();
    });
  });

  describe('deleteSession / getSessionCount', () => {
    it('deletes session and decrements count', () => {
      manager.createSession('checkout-1', 'cart-1', 'test-store');
      manager.createSession('checkout-2', 'cart-2', 'test-store');
      expect(manager.getSessionCount()).toBe(2);
      manager.deleteSession('checkout-1');
      expect(manager.getSessionCount()).toBe(1);
      expect(manager.getSession('checkout-1')).toBeUndefined();
    });
  });
});
