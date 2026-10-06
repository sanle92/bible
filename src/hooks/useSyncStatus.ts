import { useEffect, useState } from 'react';
import { subscribeSyncStatus, getSyncState, type SyncState } from '@/services/syncService';

export function useSyncStatus() {
  const [state, setState] = useState<SyncState>(getSyncState());

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setState);
    return () => unsubscribe();
  }, []);

  return state;
}
