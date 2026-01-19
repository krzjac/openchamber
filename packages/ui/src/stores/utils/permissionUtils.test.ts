import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isEditPermissionType, getAgentDefaultEditPermission } from './permissionUtils';

describe('permissionUtils', () => {
    describe('isEditPermissionType', () => {
        it('should return true for "edit"', () => {
            expect(isEditPermissionType('edit')).toBe(true);
        });

        it('should return true for "EDIT" (case insensitive)', () => {
            expect(isEditPermissionType('EDIT')).toBe(true);
        });

        it('should return true for "Edit" (mixed case)', () => {
            expect(isEditPermissionType('Edit')).toBe(true);
        });

        it('should return true for "multiedit"', () => {
            expect(isEditPermissionType('multiedit')).toBe(true);
        });

        it('should return true for "str_replace"', () => {
            expect(isEditPermissionType('str_replace')).toBe(true);
        });

        it('should return true for "str_replace_based_edit_tool"', () => {
            expect(isEditPermissionType('str_replace_based_edit_tool')).toBe(true);
        });

        it('should return true for "write"', () => {
            expect(isEditPermissionType('write')).toBe(true);
        });

        it('should return true for "WRITE" (case insensitive)', () => {
            expect(isEditPermissionType('WRITE')).toBe(true);
        });

        it('should return false for "read"', () => {
            expect(isEditPermissionType('read')).toBe(false);
        });

        it('should return false for "bash"', () => {
            expect(isEditPermissionType('bash')).toBe(false);
        });

        it('should return false for "execute"', () => {
            expect(isEditPermissionType('execute')).toBe(false);
        });

        it('should return false for null', () => {
            expect(isEditPermissionType(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isEditPermissionType(undefined)).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isEditPermissionType('')).toBe(false);
        });

        it('should return false for "editor" (partial match)', () => {
            expect(isEditPermissionType('editor')).toBe(false);
        });

        it('should return false for "multi_edit" (wrong format)', () => {
            expect(isEditPermissionType('multi_edit')).toBe(false);
        });
    });

    describe('getAgentDefaultEditPermission', () => {
        const originalWindow = global.window;

        beforeEach(() => {
            // Reset window mock before each test
            global.window = {} as Window & typeof globalThis;
        });

        afterEach(() => {
            global.window = originalWindow;
        });

        it('should return "ask" when agent name is undefined', () => {
            expect(getAgentDefaultEditPermission(undefined)).toBe('ask');
        });

        it('should return "ask" when agent name is empty', () => {
            expect(getAgentDefaultEditPermission('')).toBe('ask');
        });

        it('should return "ask" when window is undefined', () => {
            // @ts-expect-error - Intentionally setting to undefined for test
            global.window = undefined;
            expect(getAgentDefaultEditPermission('build')).toBe('ask');
        });

        it('should return "ask" when config store is not available', () => {
            expect(getAgentDefaultEditPermission('build')).toBe('ask');
        });

        it('should return "ask" when agent is not found in config', () => {
            (global.window as { __zustand_config_store__?: object }).__zustand_config_store__ = {
                getState: () => ({
                    agents: [{ name: 'other-agent' }],
                }),
            };
            
            expect(getAgentDefaultEditPermission('build')).toBe('ask');
        });

        it('should return "ask" when agent has no permissions defined', () => {
            (global.window as { __zustand_config_store__?: object }).__zustand_config_store__ = {
                getState: () => ({
                    agents: [{ name: 'build' }],
                }),
            };
            
            expect(getAgentDefaultEditPermission('build')).toBe('ask');
        });

        it('should return "allow" when agent has explicit edit permission', () => {
            (global.window as { __zustand_config_store__?: object }).__zustand_config_store__ = {
                getState: () => ({
                    agents: [{
                        name: 'build',
                        permission: [
                            { permission: 'edit', pattern: '*', action: 'allow' },
                        ],
                    }],
                }),
            };
            
            expect(getAgentDefaultEditPermission('build')).toBe('allow');
        });

        it('should return "deny" when agent has explicit edit deny', () => {
            (global.window as { __zustand_config_store__?: object }).__zustand_config_store__ = {
                getState: () => ({
                    agents: [{
                        name: 'build',
                        permission: [
                            { permission: 'edit', pattern: '*', action: 'deny' },
                        ],
                    }],
                }),
            };
            
            expect(getAgentDefaultEditPermission('build')).toBe('deny');
        });

        it('should fall back to global wildcard permission', () => {
            (global.window as { __zustand_config_store__?: object }).__zustand_config_store__ = {
                getState: () => ({
                    agents: [{
                        name: 'build',
                        permission: [
                            { permission: '*', pattern: '*', action: 'allow' },
                        ],
                    }],
                }),
            };
            
            expect(getAgentDefaultEditPermission('build')).toBe('allow');
        });

        it('should prefer explicit edit rule over global wildcard', () => {
            (global.window as { __zustand_config_store__?: object }).__zustand_config_store__ = {
                getState: () => ({
                    agents: [{
                        name: 'build',
                        permission: [
                            { permission: '*', pattern: '*', action: 'allow' },
                            { permission: 'edit', pattern: '*', action: 'deny' },
                        ],
                    }],
                }),
            };
            
            expect(getAgentDefaultEditPermission('build')).toBe('deny');
        });

        it('should use last matching rule when multiple exist', () => {
            (global.window as { __zustand_config_store__?: object }).__zustand_config_store__ = {
                getState: () => ({
                    agents: [{
                        name: 'build',
                        permission: [
                            { permission: 'edit', pattern: '*', action: 'deny' },
                            { permission: 'edit', pattern: '*', action: 'allow' },
                        ],
                    }],
                }),
            };
            
            // Last rule wins (scanning from end)
            expect(getAgentDefaultEditPermission('build')).toBe('allow');
        });

        it('should handle getState throwing an error', () => {
            (global.window as { __zustand_config_store__?: object }).__zustand_config_store__ = {
                getState: () => {
                    throw new Error('Store error');
                },
            };
            
            expect(getAgentDefaultEditPermission('build')).toBe('ask');
        });

        it('should handle null agents array', () => {
            (global.window as { __zustand_config_store__?: object }).__zustand_config_store__ = {
                getState: () => ({
                    agents: null,
                }),
            };
            
            expect(getAgentDefaultEditPermission('build')).toBe('ask');
        });

        it('should handle empty permission array', () => {
            (global.window as { __zustand_config_store__?: object }).__zustand_config_store__ = {
                getState: () => ({
                    agents: [{
                        name: 'build',
                        permission: [],
                    }],
                }),
            };
            
            expect(getAgentDefaultEditPermission('build')).toBe('ask');
        });
    });
});
