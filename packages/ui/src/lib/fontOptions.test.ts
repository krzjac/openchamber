import { describe, it, expect } from 'vitest';
import {
    UI_FONT_OPTIONS,
    CODE_FONT_OPTIONS,
    UI_FONT_OPTION_MAP,
    CODE_FONT_OPTION_MAP,
    DEFAULT_UI_FONT,
    DEFAULT_MONO_FONT,
    type UiFontOption,
    type MonoFontOption,
    type FontOptionDefinition,
} from './fontOptions';

describe('fontOptions', () => {
    describe('UI_FONT_OPTIONS', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(UI_FONT_OPTIONS)).toBe(true);
            expect(UI_FONT_OPTIONS.length).toBeGreaterThan(0);
        });

        it('should have valid FontOptionDefinition structure', () => {
            UI_FONT_OPTIONS.forEach((option) => {
                expect(option).toHaveProperty('id');
                expect(option).toHaveProperty('label');
                expect(option).toHaveProperty('description');
                expect(option).toHaveProperty('stack');
                expect(typeof option.id).toBe('string');
                expect(typeof option.label).toBe('string');
                expect(typeof option.description).toBe('string');
                expect(typeof option.stack).toBe('string');
            });
        });

        it('should have ibm-plex-sans as an option', () => {
            const ibmPlex = UI_FONT_OPTIONS.find((opt) => opt.id === 'ibm-plex-sans');
            expect(ibmPlex).toBeDefined();
            expect(ibmPlex?.label).toBe('IBM Plex Sans');
        });

        it('should have valid font stacks', () => {
            UI_FONT_OPTIONS.forEach((option) => {
                // Font stack should contain fallbacks
                expect(option.stack).toContain(',');
                // Should end with a generic family
                expect(option.stack).toMatch(/sans-serif|serif|monospace/);
            });
        });

        it('should have unique IDs', () => {
            const ids = UI_FONT_OPTIONS.map((opt) => opt.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    describe('CODE_FONT_OPTIONS', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(CODE_FONT_OPTIONS)).toBe(true);
            expect(CODE_FONT_OPTIONS.length).toBeGreaterThan(0);
        });

        it('should have valid FontOptionDefinition structure', () => {
            CODE_FONT_OPTIONS.forEach((option) => {
                expect(option).toHaveProperty('id');
                expect(option).toHaveProperty('label');
                expect(option).toHaveProperty('description');
                expect(option).toHaveProperty('stack');
            });
        });

        it('should have ibm-plex-mono as an option', () => {
            const ibmPlexMono = CODE_FONT_OPTIONS.find((opt) => opt.id === 'ibm-plex-mono');
            expect(ibmPlexMono).toBeDefined();
            expect(ibmPlexMono?.label).toBe('IBM Plex Mono');
        });

        it('should have monospace in all font stacks', () => {
            CODE_FONT_OPTIONS.forEach((option) => {
                expect(option.stack).toContain('monospace');
            });
        });

        it('should have unique IDs', () => {
            const ids = CODE_FONT_OPTIONS.map((opt) => opt.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    describe('UI_FONT_OPTION_MAP', () => {
        it('should be an object', () => {
            expect(typeof UI_FONT_OPTION_MAP).toBe('object');
        });

        it('should have all UI font options as keys', () => {
            UI_FONT_OPTIONS.forEach((option) => {
                expect(UI_FONT_OPTION_MAP).toHaveProperty(option.id);
            });
        });

        it('should map to correct FontOptionDefinition', () => {
            UI_FONT_OPTIONS.forEach((option) => {
                const mapped = UI_FONT_OPTION_MAP[option.id as UiFontOption];
                expect(mapped).toEqual(option);
            });
        });

        it('should allow direct access by id', () => {
            const ibmPlex = UI_FONT_OPTION_MAP['ibm-plex-sans'];
            expect(ibmPlex).toBeDefined();
            expect(ibmPlex.label).toBe('IBM Plex Sans');
        });
    });

    describe('CODE_FONT_OPTION_MAP', () => {
        it('should be an object', () => {
            expect(typeof CODE_FONT_OPTION_MAP).toBe('object');
        });

        it('should have all code font options as keys', () => {
            CODE_FONT_OPTIONS.forEach((option) => {
                expect(CODE_FONT_OPTION_MAP).toHaveProperty(option.id);
            });
        });

        it('should map to correct FontOptionDefinition', () => {
            CODE_FONT_OPTIONS.forEach((option) => {
                const mapped = CODE_FONT_OPTION_MAP[option.id as MonoFontOption];
                expect(mapped).toEqual(option);
            });
        });

        it('should allow direct access by id', () => {
            const ibmPlexMono = CODE_FONT_OPTION_MAP['ibm-plex-mono'];
            expect(ibmPlexMono).toBeDefined();
            expect(ibmPlexMono.label).toBe('IBM Plex Mono');
        });
    });

    describe('DEFAULT_UI_FONT', () => {
        it('should be a valid UI font option id', () => {
            expect(UI_FONT_OPTIONS.some((opt) => opt.id === DEFAULT_UI_FONT)).toBe(true);
        });

        it('should be ibm-plex-sans', () => {
            expect(DEFAULT_UI_FONT).toBe('ibm-plex-sans');
        });

        it('should exist in UI_FONT_OPTION_MAP', () => {
            expect(UI_FONT_OPTION_MAP[DEFAULT_UI_FONT]).toBeDefined();
        });
    });

    describe('DEFAULT_MONO_FONT', () => {
        it('should be a valid code font option id', () => {
            expect(CODE_FONT_OPTIONS.some((opt) => opt.id === DEFAULT_MONO_FONT)).toBe(true);
        });

        it('should be ibm-plex-mono', () => {
            expect(DEFAULT_MONO_FONT).toBe('ibm-plex-mono');
        });

        it('should exist in CODE_FONT_OPTION_MAP', () => {
            expect(CODE_FONT_OPTION_MAP[DEFAULT_MONO_FONT]).toBeDefined();
        });
    });

    describe('type safety', () => {
        it('should allow type-safe access to UI fonts', () => {
            const fontId: UiFontOption = 'ibm-plex-sans';
            const font: FontOptionDefinition<UiFontOption> = UI_FONT_OPTION_MAP[fontId];
            expect(font.id).toBe(fontId);
        });

        it('should allow type-safe access to code fonts', () => {
            const fontId: MonoFontOption = 'ibm-plex-mono';
            const font: FontOptionDefinition<MonoFontOption> = CODE_FONT_OPTION_MAP[fontId];
            expect(font.id).toBe(fontId);
        });
    });
});
