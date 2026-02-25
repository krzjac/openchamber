import React from 'react';
import { RiGitBranchLine, RiFolderLine, RiDeleteBinLine, RiLoader4Line, RiAddLine } from '@remixicon/react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useProjectsStore } from '@/stores/useProjectsStore';
import { useUIStore } from '@/stores/useUIStore';
import { listProjectWorktrees, removeProjectWorktree } from '@/lib/worktrees/worktreeManager';
import type { WorktreeMetadata } from '@/types/worktree';
import type { Session } from '@opencode-ai/sdk/v2';
import type { ProjectEntry } from '@/lib/api/types';
import { toast } from '@/components/ui';
import NewSessionDraftModal from '@/components/chat/NewSessionDraftModal';
import { cn } from '@/lib/utils';

interface WorktreeWithSessions {
    worktree: WorktreeMetadata;
    sessions: Session[];
    project: ProjectEntry;
}

const WorktreeCard: React.FC<{
    worktreeWithSessions: WorktreeWithSessions;
    onSelectSession: (sessionId: string) => void;
    onCreateSession: (worktree: WorktreeMetadata) => void;
    onDelete: (worktree: WorktreeMetadata, sessions: Session[]) => void;
    isDeleting?: boolean;
}> = ({ worktreeWithSessions, onSelectSession, onCreateSession, onDelete, isDeleting }) => {
    const { worktree, sessions, project } = worktreeWithSessions;
    const firstSession = sessions[0];
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(worktree, sessions);
    };
    
    return (
        <div
            className="flex flex-col items-start p-4 rounded-xl border border-border bg-surface hover:bg-[var(--interactive-hover)] transition-colors w-full relative"
        >
            <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                    if (firstSession) {
                        onSelectSession(firstSession.id);
                    } else {
                        onCreateSession(worktree);
                    }
                }}
                className="flex flex-col items-start text-left w-full pr-8"
            >
                <div className="flex items-center gap-2 w-full mb-2">
                    <RiGitBranchLine className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate flex-1">{worktree.label || worktree.branch}</span>
                </div>
                {firstSession ? (
                    <div className="text-sm text-foreground truncate w-full" title={firstSession.title || 'Untitled'}>
                        {firstSession.title || 'Untitled'}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground italic">
                        New session
                    </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground truncate w-full mt-2">
                    <RiFolderLine className="h-3 w-3 shrink-0" />
                    <span className="truncate" title={project.label || project.path}>
                        {project.label || project.path.split('/').pop()}
                    </span>
                </div>
            </button>
            <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                title="Remove worktree"
            >
                {isDeleting ? (
                    <RiLoader4Line className="h-4 w-4 animate-spin" />
                ) : (
                    <RiDeleteBinLine className="h-4 w-4" />
                )}
            </button>
        </div>
    );
};

const DeleteConfirmDialog: React.FC<{
    open: boolean;
    worktree: WorktreeMetadata | null;
    sessionCount: number;
    onConfirm: (options: { deleteLocalBranch: boolean; deleteRemoteBranch: boolean }) => void;
    onCancel: () => void;
    isDeleting: boolean;
}> = ({ open, worktree, sessionCount, onConfirm, onCancel, isDeleting }) => {
    const [deleteLocalBranch, setDeleteLocalBranch] = React.useState(true);
    const [deleteRemoteBranch, setDeleteRemoteBranch] = React.useState(true);
    
    if (!open || !worktree) return null;
    
    const handleConfirm = () => {
        onConfirm({ deleteLocalBranch, deleteRemoteBranch });
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-lg">
                <h3 className="text-lg font-medium mb-2">Remove Worktree</h3>
                <p className="text-muted-foreground mb-4">
                    Remove <span className="font-medium text-foreground">{worktree.label || worktree.branch}</span>?
                    {sessionCount > 0 && (
                        <span className="block mt-2">
                            This will also delete {sessionCount} session{sessionCount !== 1 ? 's' : ''}.
                        </span>
                    )}
                </p>
                <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={deleteLocalBranch}
                            onChange={(e) => setDeleteLocalBranch(e.target.checked)}
                            className="rounded border-border"
                        />
                        <span className="text-sm">Delete local branch</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={deleteRemoteBranch}
                            onChange={(e) => setDeleteRemoteBranch(e.target.checked)}
                            className="rounded border-border"
                        />
                        <span className="text-sm">Delete remote branch</span>
                    </label>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isDeleting && <RiLoader4Line className="h-4 w-4 animate-spin" />}
                        {isDeleting ? 'Removing...' : 'Remove'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const WorktreesView: React.FC = () => {
    const [worktreesByProject, setWorktreesByProject] = React.useState<Map<string, WorktreeMetadata[]>>(new Map());
    const [isLoading, setIsLoading] = React.useState(true);
    const [deleteTarget, setDeleteTarget] = React.useState<{ worktree: WorktreeMetadata; sessions: Session[]; project: ProjectEntry } | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [deletingPath, setDeletingPath] = React.useState<string | null>(null);
    const [showNewSessionModal, setShowNewSessionModal] = React.useState(false);
    
    const sessions = useSessionStore((state) => state.sessions);
    const setCurrentSession = useSessionStore((state) => state.setCurrentSession);
    const openNewSessionDraft = useSessionStore((state) => state.openNewSessionDraft);
    const deleteSessions = useSessionStore((state) => state.deleteSessions);
    const loadSessions = useSessionStore((state) => state.loadSessions);
    const projects = useProjectsStore((state) => state.projects);
    const setActiveMainTab = useUIStore((state) => state.setActiveMainTab);
    
    const refreshWorktrees = React.useCallback(async () => {
        if (projects.length === 0) {
            setWorktreesByProject(new Map());
            return;
        }
        
        const results = new Map<string, WorktreeMetadata[]>();
        
        await Promise.all(
            projects.map(async (project) => {
                try {
                    const worktrees = await listProjectWorktrees({ 
                        id: project.id, 
                        path: project.path 
                    });
                    if (worktrees.length > 0) {
                        results.set(project.id, worktrees);
                    }
                } catch {
                    // ignore errors for individual projects
                }
            })
        );
        
        setWorktreesByProject(results);
    }, [projects]);
    
    React.useEffect(() => {
        if (projects.length === 0) {
            setWorktreesByProject(new Map());
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        refreshWorktrees().finally(() => setIsLoading(false));
    }, [projects, refreshWorktrees]);
    
    const allWorktreesWithSessions: WorktreeWithSessions[] = React.useMemo(() => {
        const results: WorktreeWithSessions[] = [];
        
        for (const project of projects) {
            const projectWorktrees = worktreesByProject.get(project.id) || [];
            for (const worktree of projectWorktrees) {
                const worktreeSessions = sessions.filter((session) => {
                    type SessionWithDirectory = Session & { directory?: string };
                    const sessionDir = (session as SessionWithDirectory).directory;
                    return sessionDir === worktree.path;
                }).sort((a, b) => {
                    const aTime = a.time?.created ?? 0;
                    const bTime = b.time?.created ?? 0;
                    return bTime - aTime;
                });
                results.push({ worktree, sessions: worktreeSessions, project });
            }
        }
        
        return results.sort((a, b) => {
            const aCount = a.sessions.length;
            const bCount = b.sessions.length;
            if (aCount !== bCount) return bCount - aCount;
            return (a.worktree.label || a.worktree.branch).localeCompare(b.worktree.label || b.worktree.branch);
        });
    }, [worktreesByProject, sessions, projects]);
    
    const handleSelectSession = React.useCallback((sessionId: string) => {
        setCurrentSession(sessionId);
        setActiveMainTab('chat');
    }, [setCurrentSession, setActiveMainTab]);
    
    const handleCreateSession = React.useCallback((worktree: WorktreeMetadata) => {
        openNewSessionDraft({ directoryOverride: worktree.path });
        setActiveMainTab('chat');
    }, [openNewSessionDraft, setActiveMainTab]);
    
    const handleDeleteClick = React.useCallback((worktree: WorktreeMetadata, sessionsToDelete: Session[], project: ProjectEntry) => {
        setDeleteTarget({ worktree, sessions: sessionsToDelete, project });
    }, []);
    
    const handleDeleteConfirm = React.useCallback(async (options: { deleteLocalBranch: boolean; deleteRemoteBranch: boolean }) => {
        if (!deleteTarget) return;
        
        const { worktree, sessions: sessionsToDelete, project } = deleteTarget;
        
        setIsDeleting(true);
        setDeletingPath(worktree.path);
        
        try {
            // Delete sessions first
            if (sessionsToDelete.length > 0) {
                await deleteSessions(sessionsToDelete.map(s => s.id), { silent: true });
            }
            
            // Remove worktree
            await removeProjectWorktree(
                { id: project.id, path: project.path },
                worktree,
                { 
                    deleteLocalBranch: options.deleteLocalBranch,
                    deleteRemoteBranch: options.deleteRemoteBranch 
                }
            );
            
            toast.success('Worktree removed', {
                description: worktree.label || worktree.branch
            });
            
            // Refresh
            await refreshWorktrees();
            await loadSessions();
            
        } catch (error) {
            toast.error('Failed to remove worktree', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsDeleting(false);
            setDeletingPath(null);
            setDeleteTarget(null);
        }
    }, [deleteTarget, deleteSessions, refreshWorktrees, loadSessions]);
    
    const handleDeleteCancel = React.useCallback(() => {
        setDeleteTarget(null);
    }, []);
    
    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <RiGitBranchLine className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-medium">Worktrees</h2>
                </div>
                <button
                    type="button"
                    onClick={() => setShowNewSessionModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                >
                    <RiAddLine className="h-4 w-4" />
                    <span>Add Worktree</span>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="w-full max-w-4xl mx-auto">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : allWorktreesWithSessions.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No worktrees found. Add a project to see its worktrees.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {allWorktreesWithSessions.map((item) => (
                                <WorktreeCard
                                    key={item.worktree.path}
                                    worktreeWithSessions={item}
                                    onSelectSession={handleSelectSession}
                                    onCreateSession={handleCreateSession}
                                    onDelete={(w, s) => handleDeleteClick(w, s, item.project)}
                                    isDeleting={deletingPath === item.worktree.path}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <DeleteConfirmDialog
                open={deleteTarget !== null}
                worktree={deleteTarget?.worktree ?? null}
                sessionCount={deleteTarget?.sessions.length ?? 0}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                isDeleting={isDeleting}
            />
            
            <NewSessionDraftModal
                isOpen={showNewSessionModal}
                onClose={() => setShowNewSessionModal(false)}
            />
        </div>
    );
};

export default WorktreesView;
