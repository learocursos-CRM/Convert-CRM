import '@testing-library/jest-dom';

// Polyfill textEncoder for some libs (like supabase sometimes)
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

// Mock window.location
Object.defineProperty(window, 'location', {
    value: {
        href: '',
        pathname: '/',
        assign: jest.fn(),
        replace: jest.fn(),
        reload: jest.fn(),
    },
    writable: true,
});

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock window.alert
window.alert = jest.fn();

// Mock import.meta.env
// Note: Jest runs in Node (mostly), so import.meta is not fully supported in the same way as browser/Vite.
// However, since we are using 'ts-jest' with useESM: true, import.meta might be available but empty.
// We should global override it or rely on a babel plugin if we were using babel.
// But with ts-jest, we can try to patch it or just mock the supabase.ts service which causes the issue.
// The service IS mocked in the tests, so let's see why it still fails.
// If the failure is "SyntaxError: Cannot use 'import.meta' outside a module", 
// then we need to ensure the files are treated as modules.

// Stub env vars for tests that might accidentally touch them
process.env.VITE_SUPABASE_URL = 'https://mock.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'mock-key';
