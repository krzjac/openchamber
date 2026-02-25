import React from 'react';
import { RiAddLine, RiFolderLine, RiCloseLine } from '@remixicon/react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useProjectsStore } from '@/stores/useProjectsStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/useUIStore';
import { toast } from '@/components/ui';
import { createWorktreeWithDefaults, resolveRootTrackingRemote } from '@/lib/worktrees/worktreeCreate';
import { getRootBranch } from '@/lib/worktrees/worktreeStatus';
import { getWorktreeSetupCommands } from '@/lib/openchamberConfig';
import { opencodeClient } from '@/lib/opencode/client';
import type { ProjectEntry } from '@/lib/api/types';
import { ChatInput } from './ChatInput';

interface NewSessionDraftModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NewSessionDraftModal: React.FC<NewSessionDraftModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [selectedProject, setSelectedProject] = React.useState<ProjectEntry | null>(null);
    const [isSending, setIsSending] = React.useState(false);
    // Defer ChatInput rendering until after openNewSessionDraft clears currentSessionId.
    // Without this, the ChatInput mounts (during render) before the effect runs, and
    // initializes its local message state from the *previous* chat session's localStorage draft.
    const [draftReady, setDraftReady] = React.useState(false);
    
    const projects = useProjectsStore((state) => state.projects);
    const currentProviderId = useConfigStore((state) => state.currentProviderId);
    const currentModelId = useConfigStore((state) => state.currentModelId);
    const sendMessage = useSessionStore((state) => state.sendMessage);
    const setWorktreeMetadata = useSessionStore((state) => state.setWorktreeMetadata);
    const loadSessions = useSessionStore((state) => state.loadSessions);
    const setCurrentSession = useSessionStore((state) => state.setCurrentSession);
    const openNewSessionDraft = useSessionStore((state) => state.openNewSessionDraft);
    const closeNewSessionDraft = useSessionStore((state) => state.closeNewSessionDraft);
    const setDraftModalOpen = useSessionStore((state) => state.setDraftModalOpen);
    const draftMessage = useSessionStore((state) => state.draftMessage);
    const setDraftMessage = useSessionStore((state) => state.setDraftMessage);
    const setActiveMainTab = useUIStore((state) => state.setActiveMainTab);
    const attachedFiles = useFileStore((state) => state.attachedFiles);
    const clearAttachedFiles = useFileStore((state) => state.clearAttachedFiles);
    
    React.useEffect(() => {
        setDraftModalOpen(isOpen);
        if (isOpen) {
            // Clear any stale text from the previous chat before opening the draft.
            // This prevents typed text from a chat session leaking into the
            // worktree creation modal.
            setDraftMessage('');
            try {
                localStorage.removeItem('openchamber_chat_input_draft_new');
            } catch {
                // Ignore localStorage errors
            }
            openNewSessionDraft({});
            // Signal that the draft store is ready — ChatInput can now mount safely
            // with currentSessionId=null and an empty draft.
            setDraftReady(true);
        } else {
            setDraftReady(false);
        }
        return () => {
            setDraftModalOpen(false);
        };
    }, [isOpen, setDraftModalOpen, openNewSessionDraft, setDraftMessage]);
    
    React.useEffect(() => {
        if (!isOpen) {
            setSelectedProject(null);
            setDraftMessage('');
        }
    }, [isOpen, setDraftMessage]);
    
    React.useEffect(() => {
        if (isOpen && selectedProject) {
            openNewSessionDraft({ directoryOverride: selectedProject.path });
        }
    }, [isOpen, selectedProject, openNewSessionDraft]);
    
    const handleCreateWorktree = async () => {
        if (!selectedProject) {
            toast.error('Please select a project');
            return;
        }
        if (!currentProviderId || !currentModelId) {
            toast.error('Please select a provider and model in settings');
            return;
        }
        if (!draftMessage.trim()) {
            toast.error('Please enter a message');
            return;
        }
        
        setIsSending(true);
        
        try {
            const timestamp = Date.now();
            const worktreeName = `session-${timestamp}`;
            const branchName = worktreeName;
            
            const rootBranch = await getRootBranch(selectedProject.path);
            const rootTrackingRemote = await resolveRootTrackingRemote(selectedProject.path);
            const setupCommands = await getWorktreeSetupCommands({ id: `path:${selectedProject.path}`, path: selectedProject.path });
            
            const worktreeMetadata = await createWorktreeWithDefaults(
                { id: `path:${selectedProject.path}`, path: selectedProject.path },
                {
                    preferredName: worktreeName,
                    mode: 'new',
                    branchName,
                    worktreeName,
                    startRef: 'HEAD',
                    setupCommands,
                },
                { resolvedRootTrackingRemote: rootTrackingRemote }
            );
            
            const enrichedMetadata = {
                ...worktreeMetadata,
                createdFromBranch: rootBranch,
                kind: 'standard' as const,
            };
            
            const session = await opencodeClient.withDirectory(
                worktreeMetadata.path,
                () => opencodeClient.createSession({ title: draftMessage.slice(0, 50) || worktreeName })
            );
            
            setWorktreeMetadata(session.id, enrichedMetadata);
            
            await loadSessions();
            setCurrentSession(session.id);
            
            await sendMessage(
                draftMessage,
                currentProviderId,
                currentModelId,
                undefined,
                attachedFiles.length > 0 ? attachedFiles : undefined
            );
            
            clearAttachedFiles();
            closeNewSessionDraft();
            onClose();
            setActiveMainTab('chat');
            
            toast.success('Worktree created', {
                description: worktreeName
            });
            
        } catch (error) {
            toast.error('Failed to create worktree', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsSending(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div 
                className="bg-background border border-border rounded-xl shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
                onKeyDown={handleKeyDown}
            >
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <RiAddLine className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">New Worktree Session</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                        <RiCloseLine className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-4 border-b border-border">
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Project</label>
                    <select
                        value={selectedProject?.id || ''}
                        onChange={(e) => {
                            const project = projects.find(p => p.id === e.target.value);
                            setSelectedProject(project || null);
                        }}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                    >
                        <option value="">Select project...</option>
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.label || project.path.split('/').pop()}
                            </option>
                        ))}
                    </select>
                    {selectedProject && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <RiFolderLine className="h-3 w-3" />
                            <span className="truncate">{selectedProject.path}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex-1 overflow-hidden mt-4">
                    {draftReady && <ChatInput onMessageChange={setDraftMessage} />}
                </div>
                
                <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSending}
                        className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleCreateWorktree}
                        disabled={isSending}
                        className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSending ? 'Creating...' : 'Create & Send'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewSessionDraftModal;
