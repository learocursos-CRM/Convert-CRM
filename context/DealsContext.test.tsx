import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DealsProvider, useDeals } from './DealsContext';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { DealStage } from '../types';
import { vi, describe, beforeEach, test, expect } from 'vitest';

// Mock dependencies
vi.mock('./AuthContext', () => ({
    useAuth: vi.fn(),
}));
vi.mock('./LeadsContext', () => ({
    useLeads: vi.fn(),
}));
vi.mock('../services/supabase', () => ({
    supabase: {
        from: vi.fn()
    }
}));

describe('DealsContext', () => {
    const mockUser = { id: 'user1', name: 'User 1' };
    const mockAddActivity = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ currentUser: mockUser });
        (useLeads as any).mockReturnValue({ addActivity: mockAddActivity });

        (supabase.from as any).mockImplementation((table: string) => {
            return {
                select: vi.fn().mockResolvedValue({ data: [], error: null }),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: {}, error: null })
            };
        });
    });

    const TestComponent = () => {
        const { deals, updateDealStage } = useDeals();
        return (
            <div>
                <button onClick={() => updateDealStage('deal1', DealStage.WON)}>Win Deal</button>
            </div>
        );
    };

    test('updateDealStage calls supabase and addActivity', async () => {
        // Mock initial deals load
        const mockDealsData = [{ id: 'deal1', title: 'Deal 1', stage: DealStage.NEW, leadId: 'lead1' }];
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'deals') {
                return {
                    select: vi.fn().mockResolvedValue({ data: mockDealsData, error: null }),
                    update: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis()
                };
            }
            return { select: vi.fn().mockResolvedValue({ data: [] }) };
        });

        await act(async () => {
            render(<DealsProvider><TestComponent /></DealsProvider>);
        });

        await act(async () => {
            screen.getByText('Win Deal').click();
        });

        await waitFor(() => {
            // Verify supabase update
            expect(supabase.from).toHaveBeenCalledWith('deals');
            // Verify activity added
            expect(mockAddActivity).toHaveBeenCalledWith(expect.objectContaining({
                type: 'status_change',
                dealId: 'deal1'
            }));
        });
    });
});
