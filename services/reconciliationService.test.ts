import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureDealsForLeads } from './reconciliationService';
import { supabase } from './supabase';
import { Lead, DealStage } from '../types';

// Mock Supabase
vi.mock('./supabase', () => ({
    supabase: {
        from: vi.fn()
    }
}));

const mockUser = { id: 'user-1', name: 'Test User' };
const mockLeads: Lead[] = [
    { id: 'lead-1', name: 'Lead 1', ownerId: 'user-1' } as Lead,
    { id: 'lead-2', name: 'Lead 2', ownerId: 'user-1' } as Lead,
    { id: 'lead-3', name: 'Lead 3', ownerId: 'user-1' } as Lead,
];

describe('ensureDealsForLeads', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return all lead IDs if all have VALID deals', async () => {
        const mockSelect = vi.fn().mockResolvedValue({
            data: [
                { lead_id: 'lead-1', stage: DealStage.NEW },
                { lead_id: 'lead-2', stage: DealStage.QUALIFIED },
                { lead_id: 'lead-3', stage: DealStage.WON }
            ],
            error: null
        });
        const mockInsert = vi.fn();
        const mockUpdate = vi.fn();

        const mockFrom = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ in: mockSelect }),
            insert: mockInsert,
            update: mockUpdate
        });
        (supabase.from as any).mockImplementation(mockFrom);

        const result = await ensureDealsForLeads(mockLeads, mockUser);

        expect(result?.size).toBe(3);
        expect(mockInsert).not.toHaveBeenCalled();
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should repair invalid deals (invalid stage) and insert missing ones', async () => {
        // lead-1: Valid. lead-2: Invalid Stage. lead-3: Missing.
        const mockSelect = vi.fn().mockResolvedValue({
            data: [
                { lead_id: 'lead-1', stage: DealStage.NEW, id: 'deal-1' },
                { lead_id: 'lead-2', stage: 'Invalid Stage', id: 'deal-2' }
            ],
            error: null
        });
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ error: null }) });

        const mockFrom = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ in: mockSelect }),
            insert: mockInsert,
            update: mockUpdate
        });
        (supabase.from as any).mockImplementation(mockFrom);

        const result = await ensureDealsForLeads(mockLeads, mockUser);

        expect(result?.size).toBe(3);

        // Check Insert (Lead 3)
        expect(mockInsert).toHaveBeenCalledTimes(1);
        const insertedDeals = mockInsert.mock.calls[0][0];
        expect(insertedDeals).toHaveLength(1);
        expect(insertedDeals[0].lead_id).toBe('lead-3');

        // Check Update (Lead 2 / Deal 2)
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        const updateCall = mockUpdate.mock.calls[0][0];
        expect(updateCall.stage).toBe(DealStage.NEW);
    });

    it('should filter out leads if operations fail', async () => {
        // lead-1: Valid. lead-2: Invalid (Update fails). lead-3: Orphan (Insert fails).
        const mockSelect = vi.fn().mockResolvedValue({
            data: [
                { lead_id: 'lead-1', stage: DealStage.NEW, id: 'deal-1' },
                { lead_id: 'lead-2', stage: 'Invalid Stage', id: 'deal-2' }
            ],
            error: null
        });
        // Insert fails
        const mockInsert = vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } });
        // Update fails
        const mockUpdate = vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }) });

        const mockFrom = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ in: mockSelect }),
            insert: mockInsert,
            update: mockUpdate
        });
        (supabase.from as any).mockImplementation(mockFrom);

        const result = await ensureDealsForLeads(mockLeads, mockUser);

        expect(result?.size).toBe(1); // Only lead-1 is valid
        expect(result?.has('lead-1')).toBe(true);
        expect(result?.has('lead-2')).toBe(false); // Update failed
        expect(result?.has('lead-3')).toBe(false); // Insert failed
    });
});
