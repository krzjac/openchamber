import { describe, it, expect } from 'vitest';
import { calculateContextUsage } from './contextUtils';

describe('contextUtils', () => {
    describe('calculateContextUsage', () => {
        it('should calculate percentage correctly with normal values', () => {
            const result = calculateContextUsage(50000, 100000, 10000);
            
            // threshold = 100000 - 10000 = 90000
            // percentage = (50000 / 90000) * 100 = 55.55...
            expect(result.percentage).toBeCloseTo(55.56, 1);
            expect(result.contextLimit).toBe(100000);
            expect(result.outputLimit).toBe(10000);
            expect(result.thresholdLimit).toBe(90000);
        });

        it('should cap output reservation at 32000', () => {
            const result = calculateContextUsage(10000, 200000, 50000);
            
            // normalizedOutput should be capped at 32000
            expect(result.normalizedOutput).toBe(32000);
            // threshold = 200000 - 32000 = 168000
            expect(result.thresholdLimit).toBe(168000);
        });

        it('should handle zero context limit', () => {
            const result = calculateContextUsage(1000, 0, 1000);
            
            expect(result.percentage).toBe(0);
            expect(result.contextLimit).toBe(0);
            expect(result.thresholdLimit).toBe(1);
        });

        it('should handle zero output limit', () => {
            const result = calculateContextUsage(50000, 100000, 0);
            
            // When no output limit, use default 32000 reservation
            // threshold = 100000 - 32000 = 68000
            expect(result.thresholdLimit).toBe(68000);
            expect(result.outputLimit).toBe(0);
        });

        it('should cap percentage at 100', () => {
            const result = calculateContextUsage(200000, 100000, 10000);
            
            expect(result.percentage).toBe(100);
        });

        it('should handle negative context limit', () => {
            const result = calculateContextUsage(1000, -100, 1000);
            
            expect(result.contextLimit).toBe(0);
            expect(result.percentage).toBe(0);
        });

        it('should handle negative output limit', () => {
            const result = calculateContextUsage(1000, 100000, -1000);
            
            expect(result.outputLimit).toBe(0);
        });

        it('should handle Infinity context limit', () => {
            const result = calculateContextUsage(1000, Infinity, 1000);
            
            expect(result.contextLimit).toBe(0);
        });

        it('should handle NaN context limit', () => {
            const result = calculateContextUsage(1000, NaN, 1000);
            
            expect(result.contextLimit).toBe(0);
            expect(result.percentage).toBe(0);
        });

        it('should handle very small context limit', () => {
            const result = calculateContextUsage(1000, 100, 50);
            
            // threshold = max(100 - 50, 1) = 50
            expect(result.thresholdLimit).toBe(50);
            // percentage = min((1000 / 50) * 100, 100) = 100
            expect(result.percentage).toBe(100);
        });

        it('should ensure thresholdLimit is at least 1 when context > 0', () => {
            const result = calculateContextUsage(0, 100, 100);
            
            // threshold = max(100 - 32000 capped to 100, 1) = 1
            // Since context 100 < normalizedOutput (capped at context), it becomes 0
            // Actually: normalizedOutput = min(min(100, 32000), 100) = 100
            // threshold = max(100 - 100, 1) = 1
            expect(result.thresholdLimit).toBe(1);
        });

        it('should handle output limit larger than context limit', () => {
            const result = calculateContextUsage(1000, 50000, 100000);
            
            // normalizedOutput = min(min(100000, 32000), 50000) = 32000
            // threshold = max(50000 - 32000, 1) = 18000
            expect(result.normalizedOutput).toBe(32000);
            expect(result.thresholdLimit).toBe(18000);
        });

        it('should return correct structure', () => {
            const result = calculateContextUsage(1000, 10000, 1000);
            
            expect(result).toHaveProperty('percentage');
            expect(result).toHaveProperty('contextLimit');
            expect(result).toHaveProperty('outputLimit');
            expect(result).toHaveProperty('thresholdLimit');
            expect(result).toHaveProperty('normalizedOutput');
        });

        it('should handle zero tokens', () => {
            const result = calculateContextUsage(0, 100000, 10000);
            
            expect(result.percentage).toBe(0);
        });

        it('should handle all zeros', () => {
            const result = calculateContextUsage(0, 0, 0);
            
            expect(result.percentage).toBe(0);
            expect(result.contextLimit).toBe(0);
            expect(result.outputLimit).toBe(0);
            expect(result.thresholdLimit).toBe(1);
        });

        it('should calculate realistic Claude context scenario', () => {
            // Claude 3.5 Sonnet: 200k context, 8k output
            const result = calculateContextUsage(150000, 200000, 8192);
            
            // threshold = 200000 - 8192 = 191808
            expect(result.thresholdLimit).toBe(191808);
            // percentage = (150000 / 191808) * 100 ~ 78.2%
            expect(result.percentage).toBeCloseTo(78.2, 0);
        });

        it('should calculate realistic GPT-4 context scenario', () => {
            // GPT-4 Turbo: 128k context, 4k output
            const result = calculateContextUsage(100000, 128000, 4096);
            
            // threshold = 128000 - 4096 = 123904
            expect(result.thresholdLimit).toBe(123904);
            // percentage = (100000 / 123904) * 100 ~ 80.7%
            expect(result.percentage).toBeCloseTo(80.7, 0);
        });
    });
});
