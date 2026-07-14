import { useEffect, useState } from 'react';
import { lookupUsers } from '../api/users';
import { useAuth } from '../auth/AuthContext';

// Resolves a set of user IDs to display names in one batched request.
// Returns a map of id -> fullName; ids that are still loading or unresolvable
// (e.g. a stale/deleted user) are simply absent from the map — callers should
// fall back to showing the raw id in that case.
export function useUserNames(ids: (string | null | undefined)[]): Record<string, string> {
  const { token } = useAuth();
  const [names, setNames] = useState<Record<string, string>>({});

  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id))).sort();
  const key = uniqueIds.join(',');

  useEffect(() => {
    if (!token || uniqueIds.length === 0) return;
    let cancelled = false;
    lookupUsers(uniqueIds, token)
      .then((users) => {
        if (cancelled) return;
        setNames((prev) => {
          const next = { ...prev };
          users.forEach((u) => {
            next[u.id] = u.fullName;
          });
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, key]);

  return names;
}

// Shared fallback while a name hasn't resolved yet (or never will, e.g. a stale id).
export function userLabel(id: string, names: Record<string, string>): string {
  return names[id] ?? `${id.slice(0, 8)}…`;
}
