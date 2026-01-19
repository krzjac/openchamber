import { describe, it, expect } from 'vitest';
import {
    touchStreamingLifecycle,
    removeLifecycleEntries,
    clearLifecycleCompletionTimer,
    clearLifecycleTimersForIds,
    type MessageStreamLifecycle,
} from './streamingUtils';

describe('streamingUtils', () => {
    describe('touchStreamingLifecycle', () => {
        it('should create a new lifecycle entry for new message', () => {
            const source = new Map<string, MessageStreamLifecycle>();
            const before = Date.now();
            
            const result = touchStreamingLifecycle(source, 'msg-1');
            
            const after = Date.now();
            expect(result.has('msg-1')).toBe(true);
            const entry = result.get('msg-1')!;
            expect(entry.phase).toBe('streaming');
            expect(entry.startedAt).toBeGreaterThanOrEqual(before);
            expect(entry.startedAt).toBeLessThanOrEqual(after);
            expect(entry.lastUpdateAt).toBeGreaterThanOrEqual(before);
            expect(entry.lastUpdateAt).toBeLessThanOrEqual(after);
        });

        it('should preserve startedAt for existing entry', () => {
            const existingEntry: MessageStreamLifecycle = {
                phase: 'streaming',
                startedAt: 1000,
                lastUpdateAt: 1000,
            };
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', existingEntry],
            ]);
            
            const result = touchStreamingLifecycle(source, 'msg-1');
            
            const entry = result.get('msg-1')!;
            expect(entry.startedAt).toBe(1000);
            expect(entry.lastUpdateAt).toBeGreaterThan(1000);
        });

        it('should update lastUpdateAt for existing entry', () => {
            const existingEntry: MessageStreamLifecycle = {
                phase: 'streaming',
                startedAt: 1000,
                lastUpdateAt: 1500,
            };
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', existingEntry],
            ]);
            
            const before = Date.now();
            const result = touchStreamingLifecycle(source, 'msg-1');
            
            expect(result.get('msg-1')!.lastUpdateAt).toBeGreaterThanOrEqual(before);
        });

        it('should return a new Map instance', () => {
            const source = new Map<string, MessageStreamLifecycle>();
            const result = touchStreamingLifecycle(source, 'msg-1');
            
            expect(result).not.toBe(source);
        });

        it('should not mutate the original Map', () => {
            const source = new Map<string, MessageStreamLifecycle>();
            touchStreamingLifecycle(source, 'msg-1');
            
            expect(source.size).toBe(0);
        });

        it('should preserve other entries in the Map', () => {
            const existingEntry: MessageStreamLifecycle = {
                phase: 'streaming',
                startedAt: 1000,
                lastUpdateAt: 1000,
            };
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', existingEntry],
            ]);
            
            const result = touchStreamingLifecycle(source, 'msg-2');
            
            expect(result.has('msg-1')).toBe(true);
            expect(result.has('msg-2')).toBe(true);
            expect(result.size).toBe(2);
        });

        it('should set phase to streaming', () => {
            const source = new Map<string, MessageStreamLifecycle>();
            const result = touchStreamingLifecycle(source, 'msg-1');
            
            expect(result.get('msg-1')!.phase).toBe('streaming');
        });

        it('should handle multiple sequential touches', () => {
            let source = new Map<string, MessageStreamLifecycle>();
            
            source = touchStreamingLifecycle(source, 'msg-1');
            const firstUpdate = source.get('msg-1')!.lastUpdateAt;
            
            source = touchStreamingLifecycle(source, 'msg-1');
            const secondUpdate = source.get('msg-1')!.lastUpdateAt;
            
            expect(secondUpdate).toBeGreaterThanOrEqual(firstUpdate);
        });
    });

    describe('removeLifecycleEntries', () => {
        it('should remove specified entries', () => {
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', { phase: 'streaming', startedAt: 1000, lastUpdateAt: 1000 }],
                ['msg-2', { phase: 'streaming', startedAt: 2000, lastUpdateAt: 2000 }],
                ['msg-3', { phase: 'streaming', startedAt: 3000, lastUpdateAt: 3000 }],
            ]);
            
            const result = removeLifecycleEntries(source, ['msg-1', 'msg-2']);
            
            expect(result.has('msg-1')).toBe(false);
            expect(result.has('msg-2')).toBe(false);
            expect(result.has('msg-3')).toBe(true);
        });

        it('should return same Map if no entries to remove exist', () => {
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', { phase: 'streaming', startedAt: 1000, lastUpdateAt: 1000 }],
            ]);
            
            const result = removeLifecycleEntries(source, ['msg-nonexistent']);
            
            expect(result).toBe(source);
        });

        it('should return new Map if any entry is removed', () => {
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', { phase: 'streaming', startedAt: 1000, lastUpdateAt: 1000 }],
            ]);
            
            const result = removeLifecycleEntries(source, ['msg-1']);
            
            expect(result).not.toBe(source);
        });

        it('should handle empty ids array', () => {
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', { phase: 'streaming', startedAt: 1000, lastUpdateAt: 1000 }],
            ]);
            
            const result = removeLifecycleEntries(source, []);
            
            expect(result).toBe(source);
            expect(result.size).toBe(1);
        });

        it('should handle empty source Map', () => {
            const source = new Map<string, MessageStreamLifecycle>();
            
            const result = removeLifecycleEntries(source, ['msg-1']);
            
            expect(result).toBe(source);
            expect(result.size).toBe(0);
        });

        it('should not mutate original Map', () => {
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', { phase: 'streaming', startedAt: 1000, lastUpdateAt: 1000 }],
            ]);
            
            removeLifecycleEntries(source, ['msg-1']);
            
            expect(source.has('msg-1')).toBe(true);
        });

        it('should handle Set as iterable', () => {
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', { phase: 'streaming', startedAt: 1000, lastUpdateAt: 1000 }],
                ['msg-2', { phase: 'streaming', startedAt: 2000, lastUpdateAt: 2000 }],
            ]);
            
            const result = removeLifecycleEntries(source, new Set(['msg-1']));
            
            expect(result.has('msg-1')).toBe(false);
            expect(result.has('msg-2')).toBe(true);
        });

        it('should handle removing all entries', () => {
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', { phase: 'streaming', startedAt: 1000, lastUpdateAt: 1000 }],
                ['msg-2', { phase: 'streaming', startedAt: 2000, lastUpdateAt: 2000 }],
            ]);
            
            const result = removeLifecycleEntries(source, ['msg-1', 'msg-2']);
            
            expect(result.size).toBe(0);
        });

        it('should handle mixed existing and non-existing ids', () => {
            const source = new Map<string, MessageStreamLifecycle>([
                ['msg-1', { phase: 'streaming', startedAt: 1000, lastUpdateAt: 1000 }],
            ]);
            
            const result = removeLifecycleEntries(source, ['msg-1', 'msg-nonexistent']);
            
            expect(result).not.toBe(source);
            expect(result.has('msg-1')).toBe(false);
        });
    });

    describe('clearLifecycleCompletionTimer', () => {
        it('should not throw when called with non-existent id', () => {
            expect(() => clearLifecycleCompletionTimer('non-existent')).not.toThrow();
        });

        it('should be callable multiple times for same id', () => {
            expect(() => {
                clearLifecycleCompletionTimer('msg-1');
                clearLifecycleCompletionTimer('msg-1');
            }).not.toThrow();
        });

        it('should handle empty string id', () => {
            expect(() => clearLifecycleCompletionTimer('')).not.toThrow();
        });
    });

    describe('clearLifecycleTimersForIds', () => {
        it('should not throw when called with array of ids', () => {
            expect(() => clearLifecycleTimersForIds(['msg-1', 'msg-2'])).not.toThrow();
        });

        it('should not throw when called with empty array', () => {
            expect(() => clearLifecycleTimersForIds([])).not.toThrow();
        });

        it('should handle Set as iterable', () => {
            expect(() => clearLifecycleTimersForIds(new Set(['msg-1', 'msg-2']))).not.toThrow();
        });

        it('should handle large number of ids', () => {
            const ids = Array.from({ length: 1000 }, (_, i) => `msg-${i}`);
            expect(() => clearLifecycleTimersForIds(ids)).not.toThrow();
        });
    });
});
