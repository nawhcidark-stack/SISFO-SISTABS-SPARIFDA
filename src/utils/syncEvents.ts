// Real-time inter-tab and inter-window event broadcast bus for instant financial synchronization

export const notifyFinancialUpdateLocally = () => {
  try {
    if (typeof window !== 'undefined') {
      const timestamp = Date.now().toString();
      // 1. Dispatch custom event in current window/tab (0ms)
      window.dispatchEvent(new CustomEvent('school_finance_sync', { detail: { timestamp } }));

      // 2. Broadcast across tabs in the same browser using localStorage event (0ms)
      localStorage.setItem('school_finance_sync_ping', timestamp);

      // 3. Broadcast across tabs using modern BroadcastChannel if supported (0ms)
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('school_finance_channel');
          bc.postMessage({ type: 'FINANCE_SYNC', timestamp });
          bc.close();
        } catch (e) {}
      }
    }
  } catch (err) {
    console.error('Error broadcasting financial update locally:', err);
  }
};

export const subscribeToFinancialUpdates = (onUpdate: () => void) => {
  if (typeof window === 'undefined') return () => {};

  // Custom local event
  const handleCustom = () => onUpdate();
  window.addEventListener('school_finance_sync', handleCustom);

  // Storage event (other tabs in same browser)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'school_finance_sync_ping') {
      onUpdate();
    }
  };
  window.addEventListener('storage', handleStorage);

  // BroadcastChannel (other tabs)
  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel('school_finance_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'FINANCE_SYNC') {
          onUpdate();
        }
      };
    } catch (e) {
      bc = null;
    }
  }

  return () => {
    window.removeEventListener('school_finance_sync', handleCustom);
    window.removeEventListener('storage', handleStorage);
    if (bc) {
      bc.close();
    }
  };
};
