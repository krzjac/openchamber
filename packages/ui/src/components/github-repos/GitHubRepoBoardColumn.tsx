import type { BoardColumn } from '@/lib/github-repos/types';
import { GitHubRepoBoardCard } from './GitHubRepoBoardCard';

interface GitHubRepoBoardColumnProps {
  column: BoardColumn;
}

export function GitHubRepoBoardColumn({ column }: GitHubRepoBoardColumnProps) {
  return (
    <div className="flex min-w-[280px] max-w-[280px] flex-col rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-medium text-foreground">{column.label}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {column.items.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {column.items.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No PRs
          </div>
        ) : (
          <div className="space-y-2">
            {column.items.map((item) => (
              <GitHubRepoBoardCard
                key={item.type === 'pr' ? `pr-${item.data.number}` : `branch-${item.data.name}`}
                item={item}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
