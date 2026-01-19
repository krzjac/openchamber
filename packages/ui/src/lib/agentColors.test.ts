import { describe, it, expect } from 'vitest';
import { getAgentColor, getAgentColorPalette } from './agentColors';

describe('agentColors', () => {
    describe('getAgentColorPalette', () => {
        it('should return an array of color objects', () => {
            const palette = getAgentColorPalette();
            expect(Array.isArray(palette)).toBe(true);
            expect(palette.length).toBeGreaterThan(0);
        });

        it('should have objects with var and class properties', () => {
            const palette = getAgentColorPalette();
            palette.forEach((color) => {
                expect(color).toHaveProperty('var');
                expect(color).toHaveProperty('class');
                expect(typeof color.var).toBe('string');
                expect(typeof color.class).toBe('string');
            });
        });

        it('should have CSS variable format for var property', () => {
            const palette = getAgentColorPalette();
            palette.forEach((color) => {
                expect(color.var).toMatch(/^--[\w-]+$/);
            });
        });

        it('should have agent- prefix for class property', () => {
            const palette = getAgentColorPalette();
            palette.forEach((color) => {
                expect(color.class).toMatch(/^agent-[\w-]+$/);
            });
        });

        it('should have at least 8 colors', () => {
            const palette = getAgentColorPalette();
            expect(palette.length).toBeGreaterThanOrEqual(8);
        });
    });

    describe('getAgentColor', () => {
        it('should return first palette color for undefined agent', () => {
            const result = getAgentColor(undefined);
            const palette = getAgentColorPalette();
            expect(result).toEqual(palette[0]);
        });

        it('should return first palette color for empty string', () => {
            const result = getAgentColor('');
            const palette = getAgentColorPalette();
            expect(result).toEqual(palette[0]);
        });

        it('should return first palette color for "build" agent', () => {
            const result = getAgentColor('build');
            const palette = getAgentColorPalette();
            expect(result).toEqual(palette[0]);
        });

        it('should return consistent color for same agent name', () => {
            const result1 = getAgentColor('oracle');
            const result2 = getAgentColor('oracle');
            expect(result1).toEqual(result2);
        });

        it('should return different colors for different agent names', () => {
            const agents = ['oracle', 'librarian', 'explore', 'frontend', 'backend'];
            const colors = agents.map((agent) => getAgentColor(agent));
            
            // Not all colors need to be unique (hash collisions possible),
            // but we should have some variety
            const uniqueVars = new Set(colors.map((c) => c.var));
            expect(uniqueVars.size).toBeGreaterThan(1);
        });

        it('should return a color from palette index 1+ for non-build agents', () => {
            const palette = getAgentColorPalette();
            const nonBuildColors = palette.slice(1);
            
            const result = getAgentColor('some-agent');
            expect(nonBuildColors).toContainEqual(result);
        });

        it('should handle special characters in agent names', () => {
            const result = getAgentColor('agent-with-dashes');
            expect(result).toHaveProperty('var');
            expect(result).toHaveProperty('class');
        });

        it('should handle numeric agent names', () => {
            const result = getAgentColor('agent123');
            expect(result).toHaveProperty('var');
            expect(result).toHaveProperty('class');
        });

        it('should handle very long agent names', () => {
            const longName = 'a'.repeat(1000);
            const result = getAgentColor(longName);
            expect(result).toHaveProperty('var');
            expect(result).toHaveProperty('class');
        });

        it('should handle unicode in agent names', () => {
            const result = getAgentColor('agent-');
            expect(result).toHaveProperty('var');
            expect(result).toHaveProperty('class');
        });

        it('should distribute colors across the palette', () => {
            // Generate many agent names and check distribution
            const agents = Array.from({ length: 100 }, (_, i) => `agent-${i}`);
            const colors = agents.map((agent) => getAgentColor(agent));
            const varCounts = new Map<string, number>();
            
            colors.forEach((color) => {
                varCounts.set(color.var, (varCounts.get(color.var) || 0) + 1);
            });
            
            // Should use multiple colors from palette
            expect(varCounts.size).toBeGreaterThan(1);
        });
    });
});
