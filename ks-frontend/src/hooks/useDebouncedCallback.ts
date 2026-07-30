import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook that returns a debounced version of the callback function.
 * The callback will only be called after the delay has passed since the last invocation.
 * Also tracks pending state so components can show "saving" indicators.
 * 
 * @param callback The function to debounce
 * @param delay The delay in milliseconds (default: 500ms)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): {
  debouncedFn: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
  isPending: boolean;
} {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);
  const callbackRef = useRef(callback);
  const isPendingRef = useRef(false);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingArgsRef.current = null;
    isPendingRef.current = false;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current && pendingArgsRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      callbackRef.current(...pendingArgsRef.current);
      pendingArgsRef.current = null;
      isPendingRef.current = false;
    }
  }, []);

  const debouncedFn = useCallback((...args: Parameters<T>) => {
    pendingArgsRef.current = args;
    isPendingRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (pendingArgsRef.current) {
        callbackRef.current(...pendingArgsRef.current);
        pendingArgsRef.current = null;
        isPendingRef.current = false;
      }
      timeoutRef.current = null;
    }, delay);
  }, [delay]);

  return {
    debouncedFn,
    cancel,
    flush,
    isPending: isPendingRef.current
  };
}

export default useDebouncedCallback;
