import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { TrackedRepo } from '@/lib/github-repos/types';
import { getSafeStorage } from './utils/safeStorage';

interface GitHubReposStore {
  trackedRepos: TrackedRepo[];
  addRepo: (owner: string, repo: string) => void;
  removeRepo: (owner: string, repo: string) => void;
  isTracked: (owner: string, repo: string) => boolean;
}

const STORAGE_KEY = 'github-repos';

export const useGitHubReposStore = create<GitHubReposStore>()(
  devtools(
    persist(
      (set, get) => ({
        trackedRepos: [],

        addRepo: (owner: string, repo: string) => {
          const { trackedRepos, isTracked } = get();
          
          if (isTracked(owner, repo)) {
            return;
          }

          const newRepo: TrackedRepo = {
            owner: owner.trim(),
            repo: repo.trim(),
            addedAt: Date.now(),
          };

          set({ trackedRepos: [...trackedRepos, newRepo] });
        },

        removeRepo: (owner: string, repo: string) => {
          const { trackedRepos } = get();
          set({
            trackedRepos: trackedRepos.filter(
              (r) => !(r.owner === owner && r.repo === repo)
            ),
          });
        },

        isTracked: (owner: string, repo: string) => {
          const { trackedRepos } = get();
          return trackedRepos.some((r) => r.owner === owner && r.repo === repo);
        },
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => getSafeStorage()),
      }
    ),
    { name: 'GitHubReposStore' }
  )
);
