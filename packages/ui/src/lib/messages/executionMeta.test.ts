import { describe, it, expect } from 'vitest';
import {
    EXECUTION_FORK_META_TEXT,
    MULTIRUN_EXECUTION_FORK_PROMPT_META_TEXT,
    isExecutionForkMetaText,
} from './executionMeta';

describe('executionMeta', () => {
    describe('EXECUTION_FORK_META_TEXT', () => {
        it('should be a non-empty string', () => {
            expect(typeof EXECUTION_FORK_META_TEXT).toBe('string');
            expect(EXECUTION_FORK_META_TEXT.length).toBeGreaterThan(0);
        });

        it('should contain key instructions about responding to content', () => {
            expect(EXECUTION_FORK_META_TEXT).toContain('another session');
            expect(EXECUTION_FORK_META_TEXT).toContain('implementation plan');
            expect(EXECUTION_FORK_META_TEXT).toContain('conclusion');
            expect(EXECUTION_FORK_META_TEXT).toContain('summary');
        });
    });

    describe('MULTIRUN_EXECUTION_FORK_PROMPT_META_TEXT', () => {
        it('should be a non-empty string', () => {
            expect(typeof MULTIRUN_EXECUTION_FORK_PROMPT_META_TEXT).toBe('string');
            expect(MULTIRUN_EXECUTION_FORK_PROMPT_META_TEXT.length).toBeGreaterThan(0);
        });

        it('should contain key instructions for multi-run scenarios', () => {
            expect(MULTIRUN_EXECUTION_FORK_PROMPT_META_TEXT).toContain('AI agent');
            expect(MULTIRUN_EXECUTION_FORK_PROMPT_META_TEXT).toContain('implementation plan');
            expect(MULTIRUN_EXECUTION_FORK_PROMPT_META_TEXT).toContain('bug description');
        });

        it('should differ from EXECUTION_FORK_META_TEXT', () => {
            expect(MULTIRUN_EXECUTION_FORK_PROMPT_META_TEXT).not.toBe(EXECUTION_FORK_META_TEXT);
        });
    });

    describe('isExecutionForkMetaText', () => {
        it('should return true for exact match', () => {
            expect(isExecutionForkMetaText(EXECUTION_FORK_META_TEXT)).toBe(true);
        });

        it('should return true for match with leading whitespace', () => {
            expect(isExecutionForkMetaText('  ' + EXECUTION_FORK_META_TEXT)).toBe(true);
        });

        it('should return true for match with trailing whitespace', () => {
            expect(isExecutionForkMetaText(EXECUTION_FORK_META_TEXT + '  ')).toBe(true);
        });

        it('should return true for match with surrounding whitespace', () => {
            expect(isExecutionForkMetaText('  ' + EXECUTION_FORK_META_TEXT + '  ')).toBe(true);
        });

        it('should return false for null', () => {
            expect(isExecutionForkMetaText(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isExecutionForkMetaText(undefined)).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isExecutionForkMetaText('')).toBe(false);
        });

        it('should return false for random text', () => {
            expect(isExecutionForkMetaText('Hello world')).toBe(false);
        });

        it('should return false for partial match', () => {
            expect(isExecutionForkMetaText(EXECUTION_FORK_META_TEXT.slice(0, 50))).toBe(false);
        });

        it('should return false for MULTIRUN text', () => {
            expect(isExecutionForkMetaText(MULTIRUN_EXECUTION_FORK_PROMPT_META_TEXT)).toBe(false);
        });

        it('should return false for text with extra content appended', () => {
            expect(isExecutionForkMetaText(EXECUTION_FORK_META_TEXT + ' extra')).toBe(false);
        });

        it('should return false for text with extra content prepended', () => {
            expect(isExecutionForkMetaText('extra ' + EXECUTION_FORK_META_TEXT)).toBe(false);
        });
    });
});
