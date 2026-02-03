import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { vi, describe, beforeEach, test, expect } from 'vitest';

// Mock Supabase client
vi.mock('../services/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn(),
            updateUser: vi.fn(),
        },
        from: vi.fn(),
    },
}));

// Mock user object
const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    active: true,
    mustChangePassword: false,
};

const mockProfile = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    active: true,
    must_change_password: false,
};

// Helper component to consume context
const TestComponent = () => {
    const { currentUser, login, logout, isLoading } = useAuth();

    if (isLoading) return <div>Loading...</div>;
    if (!currentUser) return (
        <div>
            <p>Not Logged In</p>
            <button onClick={() => login('test@example.com', 'password')}>Login</button>
        </div>
    );

    return (
        <div>
            <p>Logged In as {currentUser.name}</p>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementations helpers
        const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
        fromMock.mockImplementation((table: string) => {
            if (table === 'profiles') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
                    update: vi.fn().mockReturnThis(),
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
            };
        });

        (supabase.auth.getSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: { session: null },
            error: null,
        });

        (supabase.auth.onAuthStateChange as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
        });
    });

    test('renders loading state initially then content', async () => {
        await act(async () => {
            render(
                <AuthProvider>
                    <div>Child Content</div>
                </AuthProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText('Child Content')).toBeInTheDocument();
        });
    });

    test('validates session bootstrap (restores user)', async () => {
        (supabase.auth.getSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: {
                session: {
                    user: { id: 'test-user-id', email: 'test@example.com' }
                }
            },
            error: null,
        });

        await act(async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText('Logged In as Test User')).toBeInTheDocument();
        });
    });

    test('login success updates state', async () => {
        (supabase.auth.signInWithPassword as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: {
                session: {
                    user: { id: 'test-user-id' }
                }
            },
            error: null
        });

        await act(async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );
        });

        // Click login
        await act(async () => {
            screen.getByText('Login').click();
        });

        await waitFor(() => {
            expect(screen.getByText('Logged In as Test User')).toBeInTheDocument();
        });
    });

    test('logout clears state and calls signOut', async () => {
        // Setup logged in state
        (supabase.auth.getSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: {
                session: { user: { id: 'test-user-id' } }
            },
            error: null,
        });

        await act(async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );
        });

        await waitFor(() => expect(screen.getByText('Logged In as Test User')).toBeInTheDocument());

        // Perform logout
        await act(async () => {
            screen.getByText('Logout').click();
        });

        await waitFor(() => {
            expect(supabase.auth.signOut).toHaveBeenCalled();
            expect(screen.getByText('Not Logged In')).toBeInTheDocument();
        });
    });
});
