/**
 * Parse GitHub owner and repo from a git remote URL.
 * Supports both SSH and HTTPS formats:
 * - git@github.com:owner/repo.git
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo
 */
export function parseGitHubRemoteUrl(remoteUrl: string): { owner: string; repo: string } | null {
  if (!remoteUrl) return null;

  const trimmed = remoteUrl.trim();

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  // HTTPS format: https://github.com/owner/repo.git or https://github.com/owner/repo
  const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  return null;
}

/**
 * Check if a remote URL is a GitHub URL.
 */
export function isGitHubRemoteUrl(remoteUrl: string): boolean {
  if (!remoteUrl) return false;
  const trimmed = remoteUrl.trim().toLowerCase();
  return trimmed.includes('github.com');
}
