import { describe, it, expect, beforeEach } from 'vitest';
import { MessageFreshnessDetector } from './messageFreshness';
import type { Message } from '@opencode-ai/sdk/v2';

const createMockMessage = (overrides: Record<string, unknown> = {}): Message => ({
    id: 'msg-1',
    role: 'assistant',
    sessionID: 'session-1',
    time: {
        created: Date.now(),
    },
    ...overrides,
} as unknown as Message);

describe('MessageFreshnessDetector', () => {
    let detector: MessageFreshnessDetector;

    beforeEach(() => {
        detector = MessageFreshnessDetector.getInstance();
        detector.clearAll();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = MessageFreshnessDetector.getInstance();
            const instance2 = MessageFreshnessDetector.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('recordSessionStart', () => {
        it('should record session start time', () => {
            const before = Date.now();
            detector.recordSessionStart('session-1');
            const after = Date.now();
            
            const startTime = detector.getSessionStartTime('session-1');
            expect(startTime).toBeGreaterThanOrEqual(before);
            expect(startTime).toBeLessThanOrEqual(after);
        });

        it('should overwrite existing session start time', () => {
            detector.recordSessionStart('session-1');
            const firstTime = detector.getSessionStartTime('session-1');
            
            detector.recordSessionStart('session-1');
            const secondTime = detector.getSessionStartTime('session-1');
            
            expect(secondTime).toBeGreaterThanOrEqual(firstTime!);
        });
    });

    describe('getSessionStartTime', () => {
        it('should return undefined for unknown session', () => {
            expect(detector.getSessionStartTime('unknown')).toBeUndefined();
        });

        it('should return recorded time for known session', () => {
            detector.recordSessionStart('session-1');
            expect(detector.getSessionStartTime('session-1')).toBeDefined();
        });
    });

    describe('shouldAnimateMessage', () => {
        it('should return false for user messages', () => {
            const message = createMockMessage({ role: 'user' });
            detector.recordSessionStart('session-1');
            expect(detector.shouldAnimateMessage(message, 'session-1')).toBe(false);
        });

        it('should return false for already seen messages (marked via markMessageAsAnimated)', () => {
            detector.recordSessionStart('session-1');
            
            const message = createMockMessage({
                id: 'msg-1',
                time: { created: Date.now() + 1000 },
            });
            
            detector.markMessageAsAnimated(message.id, message.time.created);
            expect(detector.shouldAnimateMessage(message, 'session-1')).toBe(false);
        });

        it('should return false when no session start time recorded', () => {
            const message = createMockMessage({
                time: { created: Date.now() },
            });
            expect(detector.shouldAnimateMessage(message, 'session-1')).toBe(false);
        });

        it('should return true for fresh messages created after session start', () => {
            detector.recordSessionStart('session-1');
            
            const message = createMockMessage({
                id: 'msg-fresh',
                time: { created: Date.now() + 1000 },
            });
            
            expect(detector.shouldAnimateMessage(message, 'session-1')).toBe(true);
        });

        it('should return false for old messages created long before session start', () => {
            detector.recordSessionStart('session-1');
            const sessionStart = detector.getSessionStartTime('session-1')!;
            
            const message = createMockMessage({
                id: 'msg-old',
                time: { created: sessionStart - 10000 },
            });
            
            expect(detector.shouldAnimateMessage(message, 'session-1')).toBe(false);
        });

        it('should mark old messages as seen', () => {
            detector.recordSessionStart('session-1');
            const sessionStart = detector.getSessionStartTime('session-1')!;
            
            const message = createMockMessage({
                id: 'msg-old',
                time: { created: sessionStart - 10000 },
            });
            
            detector.shouldAnimateMessage(message, 'session-1');
            expect(detector.hasBeenAnimated('msg-old')).toBe(true);
        });
    });

    describe('clearSession', () => {
        it('should remove session start time', () => {
            detector.recordSessionStart('session-1');
            detector.clearSession('session-1');
            expect(detector.getSessionStartTime('session-1')).toBeUndefined();
        });

        it('should not affect other sessions', () => {
            detector.recordSessionStart('session-1');
            detector.recordSessionStart('session-2');
            detector.clearSession('session-1');
            expect(detector.getSessionStartTime('session-2')).toBeDefined();
        });
    });

    describe('hasSessionTiming', () => {
        it('should return false for unknown session', () => {
            expect(detector.hasSessionTiming('unknown')).toBe(false);
        });

        it('should return true for recorded session', () => {
            detector.recordSessionStart('session-1');
            expect(detector.hasSessionTiming('session-1')).toBe(true);
        });
    });

    describe('hasBeenAnimated', () => {
        it('should return false for unknown message', () => {
            expect(detector.hasBeenAnimated('unknown')).toBe(false);
        });

        it('should return true for animated message', () => {
            detector.markMessageAsAnimated('msg-1', Date.now());
            expect(detector.hasBeenAnimated('msg-1')).toBe(true);
        });
    });

    describe('markMessageAsAnimated', () => {
        it('should mark message as animated', () => {
            detector.markMessageAsAnimated('msg-1', 12345);
            expect(detector.hasBeenAnimated('msg-1')).toBe(true);
        });

        it('should store creation time', () => {
            detector.markMessageAsAnimated('msg-1', 12345);
            const debugInfo = detector.getDebugInfo();
            expect(debugInfo.messageCreationTimes.get('msg-1')).toBe(12345);
        });
    });

    describe('clearAll', () => {
        it('should clear all data', () => {
            detector.recordSessionStart('session-1');
            detector.markMessageAsAnimated('msg-1', 12345);
            
            detector.clearAll();
            
            expect(detector.getSessionStartTime('session-1')).toBeUndefined();
            expect(detector.hasBeenAnimated('msg-1')).toBe(false);
        });
    });

    describe('getDebugInfo', () => {
        it('should return copies of internal data', () => {
            detector.recordSessionStart('session-1');
            detector.markMessageAsAnimated('msg-1', 12345);
            
            const debugInfo = detector.getDebugInfo();
            
            expect(debugInfo.sessionStartTimes.has('session-1')).toBe(true);
            expect(debugInfo.seenMessageIds.has('msg-1')).toBe(true);
            expect(debugInfo.messageCreationTimes.has('msg-1')).toBe(true);
        });

        it('should return independent copies', () => {
            const debugInfo1 = detector.getDebugInfo();
            debugInfo1.sessionStartTimes.set('modified', 999);
            
            const debugInfo2 = detector.getDebugInfo();
            expect(debugInfo2.sessionStartTimes.has('modified')).toBe(false);
        });
    });
});
