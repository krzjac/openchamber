import { describe, it, expect, beforeEach } from 'vitest';
import { CSSVariableGenerator } from './cssGenerator';
import type { Theme } from '@/types/theme';

const createMinimalTheme = (overrides: Partial<Theme> = {}): Theme => ({
    metadata: {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test theme for unit tests',
        author: 'Test',
        version: '1.0.0',
        variant: 'dark',
        tags: ['test'],
    },
    colors: {
        primary: {
            base: '#4791ba',
            hover: '#5aa9d9',
            active: '#3a7a9e',
            foreground: '#ffffff',
            muted: '#4791ba80',
            emphasis: '#5bb8e8',
        },
        surface: {
            background: '#100f0f',
            foreground: '#cecdc3',
            muted: '#1c1b1a',
            mutedForeground: '#878580',
            elevated: '#282726',
            elevatedForeground: '#cecdc3',
            overlay: '#100f0f99',
            subtle: '#343331',
        },
        interactive: {
            border: '#343331',
            borderHover: '#403e3c',
            borderFocus: '#4791ba',
            selection: '#4791ba33',
            selectionForeground: '#cecdc3',
            focus: '#4791ba33',
            focusRing: '#4791ba66',
            cursor: '#cecdc3',
            hover: '#1c1b1a',
            active: '#282726',
        },
        status: {
            error: '#d14d41',
            errorForeground: '#ffffff',
            errorBackground: '#d14d4126',
            errorBorder: '#d14d4133',
            warning: '#da702c',
            warningForeground: '#ffffff',
            warningBackground: '#da702c26',
            warningBorder: '#da702c33',
            success: '#879a39',
            successForeground: '#ffffff',
            successBackground: '#879a3926',
            successBorder: '#879a3933',
            info: '#4385be',
            infoForeground: '#ffffff',
            infoBackground: '#4385be26',
            infoBorder: '#4385be33',
        },
        syntax: {
            base: {
                background: '#100f0f',
                foreground: '#cecdc3',
                comment: '#6b6964',
                keyword: '#d8886d',
                string: '#81af6c',
                number: '#d39373',
                function: '#5aa9d9',
                variable: '#d29470',
                type: '#c2974d',
                operator: '#d29470',
            },
        },
    },
    ...overrides,
} as Theme);

describe('CSSVariableGenerator', () => {
    let generator: CSSVariableGenerator;

    beforeEach(() => {
        generator = new CSSVariableGenerator();
    });

    describe('generate', () => {
        it('should generate CSS variables string', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should include primary color variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--primary-base');
            expect(result).toContain('--primary-hover');
            expect(result).toContain('--primary-foreground');
        });

        it('should include surface color variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--surface-background');
            expect(result).toContain('--surface-foreground');
            expect(result).toContain('--surface-muted');
        });

        it('should include interactive color variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--interactive-border');
            expect(result).toContain('--interactive-hover');
            expect(result).toContain('--interactive-focus-ring');
        });

        it('should include status color variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--status-error');
            expect(result).toContain('--status-warning');
            expect(result).toContain('--status-success');
            expect(result).toContain('--status-info');
        });

        it('should include syntax color variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--syntax-background');
            expect(result).toContain('--syntax-keyword');
            expect(result).toContain('--syntax-string');
            expect(result).toContain('--syntax-function');
        });

        it('should include Tailwind compatibility variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--background');
            expect(result).toContain('--foreground');
            expect(result).toContain('--card');
            expect(result).toContain('--border');
            expect(result).toContain('--ring');
        });

        it('should include sidebar variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--sidebar');
            expect(result).toContain('--sidebar-foreground');
            expect(result).toContain('--sidebar-accent');
        });

        it('should include markdown variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--markdown-heading1');
            expect(result).toContain('--markdown-link');
            expect(result).toContain('--markdown-inline-code');
        });

        it('should include chat variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--chat-background');
            expect(result).toContain('--chat-user-message');
            expect(result).toContain('--chat-assistant-message');
        });

        it('should include tools variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--tools-background');
            expect(result).toContain('--tools-edit-added');
            expect(result).toContain('--tools-edit-removed');
        });

        it('should include typography variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--text-markdown');
            expect(result).toContain('--text-code');
            expect(result).toContain('--text-ui-label');
        });

        it('should include config variables when present', () => {
            const theme = createMinimalTheme({
                config: {
                    fonts: {
                        sans: 'Inter, sans-serif',
                        mono: 'JetBrains Mono, monospace',
                    },
                    radius: {
                        sm: '0.25rem',
                        md: '0.5rem',
                        lg: '1rem',
                    },
                },
            });
            const result = generator.generate(theme);
            
            expect(result).toContain('--font-sans');
            expect(result).toContain('--radius-md');
        });

        it('should handle light theme variant', () => {
            const theme = createMinimalTheme({
                metadata: {
                    id: 'light-theme',
                    name: 'Light',
                    description: 'Light theme',
                    author: 'Test',
                    version: '1.0.0',
                    variant: 'light',
                    tags: ['test'],
                },
            });
            const result = generator.generate(theme);
            
            expect(result).toContain('--background');
        });

        it('should handle charts colors when present', () => {
            const theme = createMinimalTheme({
                colors: {
                    ...createMinimalTheme().colors,
                    charts: {
                        series: ['#ff0000', '#00ff00', '#0000ff'],
                    },
                },
            } as Partial<Theme>);
            const result = generator.generate(theme);
            
            expect(result).toContain('--chart-1');
            expect(result).toContain('--chart-2');
            expect(result).toContain('--chart-3');
        });

        it('should include loading spinner variables', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--loading-spinner');
            expect(result).toContain('--loading-spinner-track');
        });
    });

    describe('apply', () => {
        beforeEach(() => {
            document.head.innerHTML = '';
            document.documentElement.className = '';
            document.documentElement.removeAttribute('data-theme');
            document.documentElement.style.cssText = '';
        });

        it('should add style element to document head', () => {
            const theme = createMinimalTheme();
            generator.apply(theme);
            
            const style = document.getElementById('opencode-theme-variables');
            expect(style).not.toBeNull();
        });

        it('should add dark class for dark theme', () => {
            const theme = createMinimalTheme({
                metadata: {
                    id: 'dark-theme',
                    name: 'Dark',
                    description: 'Dark theme',
                    author: 'Test',
                    version: '1.0.0',
                    variant: 'dark',
                    tags: ['test'],
                },
            });
            generator.apply(theme);
            
            expect(document.documentElement.classList.contains('dark')).toBe(true);
            expect(document.documentElement.classList.contains('light')).toBe(false);
        });

        it('should add light class for light theme', () => {
            const theme = createMinimalTheme({
                metadata: {
                    id: 'light-theme',
                    name: 'Light',
                    description: 'Light theme',
                    author: 'Test',
                    version: '1.0.0',
                    variant: 'light',
                    tags: ['test'],
                },
            });
            generator.apply(theme);
            
            expect(document.documentElement.classList.contains('light')).toBe(true);
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });

        it('should set data-theme attribute', () => {
            const theme = createMinimalTheme();
            generator.apply(theme);
            
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it('should replace existing style element', () => {
            const theme1 = createMinimalTheme();
            const theme2 = createMinimalTheme({
                metadata: {
                    id: 'theme-2',
                    name: 'Theme 2',
                    description: 'Second theme',
                    author: 'Test',
                    version: '1.0.0',
                    variant: 'light',
                    tags: ['test'],
                },
            });
            
            generator.apply(theme1);
            generator.apply(theme2);
            
            const styles = document.querySelectorAll('#opencode-theme-variables');
            expect(styles.length).toBe(1);
        });
    });

    describe('color utility methods', () => {
        it('should generate valid CSS output', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            const lines = result.split('\n');
            lines.forEach((line) => {
                if (line.trim() && !line.includes('/*')) {
                    expect(line).toMatch(/^\s*--[\w-]+:|^\s*$/);
                }
            });
        });

        it('should handle hex colors with opacity', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('#');
        });

        it('should generate RGB values for sidebar', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--sidebar-base-rgb');
        });
    });

    describe('syntax token generation', () => {
        it('should generate extended syntax tokens', () => {
            const theme = createMinimalTheme();
            const result = generator.generate(theme);
            
            expect(result).toContain('--syntax-comment-doc');
            expect(result).toContain('--syntax-string-escape');
            expect(result).toContain('--syntax-keyword-control');
            expect(result).toContain('--syntax-function-call');
        });

        it('should use custom tokens when provided', () => {
            const theme = createMinimalTheme({
                colors: {
                    ...createMinimalTheme().colors,
                    syntax: {
                        base: createMinimalTheme().colors.syntax.base,
                        tokens: {
                            commentDoc: '#custom-comment',
                        },
                    },
                },
            } as Partial<Theme>);
            const result = generator.generate(theme);
            
            expect(result).toContain('#custom-comment');
        });
    });
});
