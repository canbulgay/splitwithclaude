import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * Enhanced lazy loading hook with error handling and retry mechanism
 */
export function useLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  retryDelay = 1000,
  maxRetries = 3
): LazyExoticComponent<T> {
  return lazy(() => {
    let retryCount = 0;
    
    const loadComponent = async (): Promise<{ default: T }> => {
      try {
        return await importFunc();
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Failed to load component, retrying... (${retryCount}/${maxRetries})`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return loadComponent();
        }
        
        console.error('Failed to load component after max retries:', error);
        throw error;
      }
    };
    
    return loadComponent();
  });
}

/**
 * Preload a component for better UX
 */
export function preloadComponent(importFunc: () => Promise<{ default: ComponentType<any> }>) {
  importFunc().catch(error => {
    console.warn('Failed to preload component:', error);
  });
}

export default useLazyComponent;