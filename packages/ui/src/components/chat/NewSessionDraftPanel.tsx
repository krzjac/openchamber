import React from 'react';
import { RiAddLine, RiFolderLine, RiSendPlaneFill, RiLoader4Line, RiCloseLine } from '@remixicon/react';
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

interface NewSessionDraftPanelProps {
    showDraftContext?: boolean;
}

export const NewSessionDraftPanel: React.FC<NewSessionDraftPanelProps> = ({
    showDraftContext = false,
}) => {
    const [selectedProject, setSelectedProject] = React.useState<ProjectEntry | null>(null);
    const [selectedModel, setSelectedModel] = React.useState<{ providerId: string; modelId: string; name: string } | null>(null);
    const [isSending, setIsSending] = React.useState(false);
    
    const projects = useProjectsStore((state) => state.projects);
    const providers = useConfigStore((state) => state.providers);
    const agents = useConfigStore((state) => state.agents);
    const sendMessage = useSessionStore((state) => state.sendMessage);
    const setWorktreeMetadata = useSessionStore((state) => state.setWorktreeMetadata);
    const loadSessions = useSessionStore((state) => state.loadSessions);
    const closeNewSessionDraft = useSessionStore((state) => state.closeNewSessionDraft);
    const setCurrentSession = useSessionStore((state) => state.setCurrentSession);
    const setActiveMainTab = useUIStore((state) => state.setActiveMainTab);
    const setDraftMessage = useSessionStore((state) => state.setDraftMessage);
    const draftMessage = useSessionStore((state) => state.draftMessage);
    const attachedFiles = useFileStore((state) => state.attachedFiles);
    const clearAttachedFiles = useFileStore((state) => state.clearAttachedFiles);
    
    const availableModels = React.useMemo(() => {
        const models: Array<{ providerId: string; modelId: string; name: string; agentName?: string }> = [];
        for (const [providerId, provider] of Object.entries(providers)) {
            if (!provider?.models) continue;
            for (const model of provider.models) {
                models.push({
                    providerId,
                    modelId: model.id,
                    name: model.name || model.id,
                });
            }
        }
        return models;
    }, [providers]);
    
    const handleSend = async () => {
        if (!selectedProject) {
            toast.error('Please select a project');
            return;
        }
        if (!selectedModel) {
            toast.error('Please select a model');
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
            setActiveMainTab('chat');
            
            const filesToSend = attachedFiles.length > 0 ? attachedFiles : undefined;
            
            await sendMessage(
                draftMessage,
                selectedModel.providerId,
                selectedModel.modelId,
                undefined,
                attachedFiles
            );
            
            setDraftMessage('');
            clearAttachedFiles();
            closeNewSessionDraft();
            
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
    
    return (
        <div className="flex flex-col items-center justify-center gap-4 w-full max-w-xl mx-auto p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <RiAddLine className="h-5 w-5" />
                <span className="font-medium">New Worktree Session</span>
            </div>
            
            <div className="flex flex-col gap-3 w-full">
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Project</label>
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
                    </div>
                    
                    <div className="flex-1">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Model</label>
                        <select
                            value={selectedModel ? `${selectedModel.providerId}:${selectedModel.modelId}` : ''}
                            onChange={(e) => {
                                const [providerId, modelId] = e.target.value.split(':');
                                const model = availableModels.find(m => m.providerId === providerId && m.modelId === modelId);
                                setSelectedModel(model || null);
                            }}
                            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                        >
                            <option value="">Select model...</option>
                            {availableModels.map(model => (
                                <option key={`${model.providerId}:${model.modelId}`} value={`${model.providerId}:${model.modelId}`}>
                                    {model.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                
                {selectedProject && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <RiFolderLine className="h-3 w-3" />
                        <span className="truncate">{selectedProject.path}</span>
                    </div>
                )}
                
                {attachedFiles.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{attachedFiles.length} file(s)</span>
                        <button
                            type="button"
                            onClick={clearAttachedFiles}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            <RiCloseLine className="h-3 w-3" />
                        </button>
                    </div>
                )}
                
                <div className="flex justify-end gap-2 mt-2">
                    <button
                        type="button"
                        onClick={() => {
                            setDraftMessage('');
                            setSelectedProject(null);
                            setSelectedModel(null);
                            closeNewSessionDraft();
                        }}
                        disabled={isSending}
                        className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={isSending || !selectedProject || !selectedModel || !draftMessage.trim()}
                        className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSending ? (
                            <>
                                <RiLoader4Line className="h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <RiSendPlaneFill className="h-4 w-4" />
                                Create & Send
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewSessionDraftPanel;
