import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { WaitingListProvider, useWaitingList } from './WaitingListContext';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { useDeals } from './DealsContext';
import { vi, describe, beforeEach, test, expect } from 'vitest';

// Mock dependencies
vi.mock('./AuthContext', () => ({
    useAuth: vi.fn(),
}));
vi.mock('./LeadsContext', () => ({
    useLeads: vi.fn(),
}));
vi.mock('./DealsContext', () => ({
    useDeals: vi.fn(),
}));
vi.mock('../services/supabase', () => ({
    supabase: {
        from: vi.fn()
    }
}));

describe('WaitingListContext', () => {
    const mockUser = { id: 'user1', name: 'User 1' };
    const mockLeads = [{ id: 'lead1', name: 'Lead One', email: 'l1@test.com' }];
    const mockDeals = [{ id: 'deal1', leadId: 'lead1', title: 'Deal 1', value: 1000, ownerId: 'user1' }];
    const mockAddActivity = vi.fn();
    const mockRefreshDeals = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        (useAuth as any).mockReturnValue({ currentUser: mockUser });
        (useLeads as any).mockReturnValue({ leads: mockLeads, addActivity: mockAddActivity });
        (useDeals as any).mockReturnValue({ deals: mockDeals, refreshDeals: mockRefreshDeals });

        // Supabase mocks
        (supabase.from as any).mockImplementation((table: string) => {
            const mockReturn = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: {}, error: null }),
            };
            // Specific return for waiting_list fetch
            if (table === 'waiting_list') {
                mockReturn.select.mockResolvedValue({ data: [], error: null });
            }
            return mockReturn;
        });
    });

    const TestComponent = () => {
        const { waitingList, moveToWaitingList, restoreFromWaitingList } = useWaitingList();
        return (
            <div>
                <div data-testid="count">{waitingList.length}</div>
                <button onClick={() => moveToWaitingList('deal1', 'Test Reason')}>Move</button>
                <button onClick={() => restoreFromWaitingList('wl1')}>Restore</button>
            </div>
        );
    };

    test('moveToWaitingList calls supabase update and insert', async () => {
        // Setup insert return
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'deals') {
                return { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
            }
            if (table === 'waiting_list') {
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: {
                            id: 'wl1', lead_id: 'lead1', deal_id: 'deal1'
                        },
                        error: null
                    })
                };
            }
            return { select: vi.fn().mockResolvedValue({ data: [] }) };
        });

        await act(async () => {
            render(<WaitingListProvider><TestComponent /></WaitingListProvider>);
        });

        await act(async () => {
            screen.getByText('Move').click();
        });

        await waitFor(() => {
            expect(mockAddActivity).toHaveBeenCalled();
            expect(mockRefreshDeals).toHaveBeenCalled();
        });
    });
});
