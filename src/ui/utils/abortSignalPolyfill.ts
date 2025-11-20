/**
 * AbortSignal polyfill and utilities
 * 
 * Provides AbortSignal.any() polyfill for browsers that don't support it.
 * This ensures request cancellation works correctly across all browsers.
 */

/**
 * Creates a combined AbortSignal that aborts when any of the provided signals abort.
 * Polyfill for AbortSignal.any() (added in 2023).
 * 
 * @param signals - Array of AbortSignals to combine
 * @returns A new AbortSignal that aborts when any input signal aborts
 */
export function createCombinedAbortSignal(signals: AbortSignal[]): AbortSignal {
  // Use native AbortSignal.any() if available
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }

  // Polyfill: Create a new controller and listen to all signals
  const controller = new AbortController();
  
  // If any signal is already aborted, abort immediately
  if (signals.some(signal => signal.aborted)) {
    controller.abort();
    return controller.signal;
  }

  // Listen to all signals and abort when any one aborts
  const abortListener = () => {
    controller.abort();
    // Clean up listeners
    signals.forEach(signal => {
      signal.removeEventListener('abort', abortListener);
    });
  };

  signals.forEach(signal => {
    signal.addEventListener('abort', abortListener);
  });

  return controller.signal;
}

/**
 * Safely merges multiple AbortSignals into one.
 * Prefers native AbortSignal.any() if available, otherwise uses polyfill.
 * 
 * This is a convenience function that handles edge cases (0 or 1 signals)
 * and delegates to createCombinedAbortSignal for multiple signals.
 * 
 * @param signals - AbortSignals to merge (variadic arguments)
 * @returns Combined AbortSignal that aborts when any input signal aborts
 * 
 * @example
 * ```typescript
 * const timeoutSignal = new AbortController().signal;
 * const userSignal = new AbortController().signal;
 * const merged = mergeAbortSignals(timeoutSignal, userSignal);
 * ```
 */
export function mergeAbortSignals(...signals: AbortSignal[]): AbortSignal {
  // Edge case: No signals provided - return a non-aborted signal
  if (signals.length === 0) {
    const controller = new AbortController();
    return controller.signal;
  }
  
  // Edge case: Single signal - return it directly (no need to combine)
  if (signals.length === 1) {
    return signals[0]!;
  }

  // Multiple signals: combine them
  return createCombinedAbortSignal(signals);
}

