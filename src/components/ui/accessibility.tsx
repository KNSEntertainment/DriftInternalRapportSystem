'use client';

import { useEffect } from 'react';

// Skip link component for keyboard navigation
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
    >
      Hopp til hovedinnhold
    </a>
  );
}

// Live region for announcing dynamic content changes
export function LiveRegion() {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      id="live-region"
    />
  );
}

// Status region for announcing status updates
export function StatusRegion() {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      id="status-region"
    />
  );
}

// Focus management hook
export function useFocusManagement(isOpen: boolean, trapRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isOpen || !trapRef.current) return;

    const trap = trapRef.current;
    const focusableElements = trap.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    trap.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      trap.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, trapRef]);
}

// Announcer for screen readers
export function useAnnouncer() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const element = document.getElementById(
      priority === 'assertive' ? 'status-region' : 'live-region'
    );
    
    if (element) {
      element.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        element.textContent = '';
      }, 1000);
    }
  };

  return { announce };
}

// Accessibility utilities
export const a11y = {
  // Generate proper ARIA labels
  getLabel: (action: string, object: string) => `${action} ${object}`,
  
  // Generate descriptions for complex elements
  getDescription: (type: string, count: number) => {
    switch (type) {
      case 'activities':
        return `${count} aktivitet${count !== 1 ? 'er' : ''}`;
      case 'projects':
        return `${count} prosjekt${count !== 1 ? 'er' : ''}`;
      case 'users':
        return `${count} bruker${count !== 1 ? 'e' : ''}`;
      default:
        return `${count} ${type}`;
    }
  },
  
  // Check color contrast (simplified)
  checkContrast: (foreground: string, background: string) => {
    // This is a simplified check - in production, use a proper contrast calculation library
    const fg = foreground.toLowerCase();
    const bg = background.toLowerCase();
    
    // Basic contrast checks for common color combinations
    if ((fg.includes('white') || fg.includes('#fff') || fg.includes('#ffffff')) && 
        (bg.includes('black') || bg.includes('#000') || bg.includes('#000000'))) {
      return true;
    }
    
    if ((fg.includes('black') || fg.includes('#000') || fg.includes('#000000')) && 
        (bg.includes('white') || bg.includes('#fff') || bg.includes('#ffffff'))) {
      return true;
    }
    
    // Default to true for now - implement proper contrast calculation
    return true;
  },
  
  // Generate keyboard navigation hints
  getKeyboardHint: (actions: Record<string, string>) => {
    return Object.entries(actions)
      .map(([key, action]) => `${key}: ${action}`)
      .join(', ');
  },
};

// Custom hook for keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const modifierKey = e.ctrlKey || e.metaKey;
      
      Object.entries(shortcuts).forEach(([shortcut, callback]) => {
        const [mainKey, ...modifiers] = shortcut.toLowerCase().split('+');
        
        if (key === mainKey && 
            modifiers.includes('ctrl') === modifierKey &&
            modifiers.includes('meta') === modifierKey &&
            modifiers.includes('shift') === e.shiftKey &&
            modifiers.includes('alt') === e.altKey) {
          e.preventDefault();
          callback();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Component for keyboard shortcuts help
export function KeyboardShortcutsHelp({ shortcuts }: { shortcuts: Record<string, string> }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg" role="region" aria-label="Tastatursnarveier">
      <h3 className="font-semibold mb-2">Tastatursnarveier</h3>
      <ul className="space-y-1 text-sm">
        {Object.entries(shortcuts).map(([shortcut, description]) => (
          <li key={shortcut} className="flex justify-between">
            <kbd className="px-2 py-1 bg-white border rounded text-xs">
              {shortcut}
            </kbd>
            <span>{description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
