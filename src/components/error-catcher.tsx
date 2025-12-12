'use client';

import { useEffect } from 'react';

export function ErrorCatcher() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.log('=== UNHANDLED PROMISE REJECTION ===');
      console.log('Reason:', event.reason);
      console.log('Promise:', event.promise);
      if (event.reason?.stack) {
        console.log('Stack:', event.reason.stack);
      }
      // Hatayı bastır (opsiyonel)
      // event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
