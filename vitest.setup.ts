import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks
Object.defineProperty(window, 'location', {
    value: {
        href: '',
        pathname: '/',
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
    },
    writable: true,
});

window.scrollTo = vi.fn();
window.alert = vi.fn();
console.error = vi.fn(); // suppress jsdom errors for clean output, optional
