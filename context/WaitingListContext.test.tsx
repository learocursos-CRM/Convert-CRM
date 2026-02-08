import { renderHook, act } from '@testing-library/react';
import { WaitingListProvider, useWaitingList } from './WaitingListContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Hoisted Mocks
const { mockFrom, mockSelect, mockDelete, mockEq, mockInsert } = vi.hoisted(() => {
    const mockSelect = vi.fn();
    const mockDelete = vi.fn();
    const mockEq = vi.fn();
    const mockInsert = vi.fn();
    const mockUpdate = vi.fn();

    const mockFrom = vi.fn(() => ({
        select: mockSelect,
        delete: mockDelete,
        insert: mockInsert,
        update: mockUpdate,
    }));

    return { mockFrom, mockSelect, mockDelete, mockEq, mockInsert };
});

// Setup chain behavior
mockSelect.mockReturnValue({ data: [], error: null });
mockDelete.mockReturnValue({ eq: mockEq });
mockEq.mockResolvedValue({ data: {}, error: null });
mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {} }) }) });


vi.mock('../services/supabase', () => ({
    supabase: {
        from: mockFrom
    }
}));

const mockUser = { id: 'admin-id', role: 'admin', name: 'Admin User' };

vi.mock('./AuthContext', () => ({
    useAuth: () => ({ currentUser: mockUser })
}));

vi.mock('./LeadsContext', () => ({
    useLeads: () => ({ leads: [], addActivity: vi.fn() })
}));

vi.mock('./DealsContext', () => ({
    useDeals: () => ({ deals: [], refreshDeals: vi.fn() })
}));

describe('WaitingListContext - Deletion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset default behaviors
        mockSelect.mockReturnValue({
            data: [{ id: '1', leadId: 'lead-1', leads: { name: 'Test' }, created_at: '2023-01-01', owner_id: 'owner-1' }],
            error: null
        });

        // Mock window.confirm
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('should allow admin to delete item', async () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <WaitingListProvider>{children}</WaitingListProvider>
        );

        const { result } = renderHook(() => useWaitingList(), { wrapper });

        // Populate list first (mocked refresh)
        await act(async () => {
            await result.current.refreshWaitingList();
        });

        // Delete
        await act(async () => {
            await result.current.removePermanent('1');
        });

        // Supabase delete should have been called
        expect(mockFrom).toHaveBeenCalledWith('waiting_list');
        // We verify the chain call indirectly or if possible directly
        // Given the mock setup, we can verify what mockDelete returns or if it was called
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', '1');
    });
});
