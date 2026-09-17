import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom lacks matchMedia — framer-motion's useReducedMotion expects it.
if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }),
    });
}

// jsdom lacks IntersectionObserver — framer-motion's whileInView expects it.
if (!window.IntersectionObserver) {
    class StubIntersectionObserver {
        constructor(_cb: IntersectionObserverCallback) {}
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
            return [];
        }
        root = null;
        rootMargin = '';
        thresholds = [];
    }
    Object.defineProperty(window, 'IntersectionObserver', {
        writable: true,
        value: StubIntersectionObserver,
    });
}

afterEach(() => {
    cleanup();
    window.localStorage.clear();
});
