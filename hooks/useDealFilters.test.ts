import { renderHook, act } from '@testing-library/react';
import { useDealFilters } from './useDealFilters';
import { describe, it, expect } from 'vitest';
import { Deal, Lead, DealStage } from '../types';

describe('useDealFilters', () => {
    const mockLeads = [
        { id: 'l1', name: 'John Doe', company: 'Doe Corp' }
    ] as Lead[];

    const mockDeals = [
        { id: 'd1', title: 'Deal 1', leadId: 'l1', stage: DealStage.NEW },
        { id: 'd2', title: 'Another Deal', leadId: 'l2', stage: DealStage.WON } // l2 missing
    ] as Deal[];

    it('filters by search term (deal title)', () => {
        const { result } = renderHook(() => useDealFilters({ deals: mockDeals, leads: mockLeads }));

        act(() => result.current.setSearchTerm('Another'));
        expect(result.current.filteredDeals).toHaveLength(1);
        expect(result.current.filteredDeals[0].title).toBe('Another Deal');
    });

    it('filters by search term (lead name)', () => {
        const { result } = renderHook(() => useDealFilters({ deals: mockDeals, leads: mockLeads }));

        act(() => result.current.setSearchTerm('John'));
        expect(result.current.filteredDeals).toHaveLength(1);
        expect(result.current.filteredDeals[0].title).toBe('Deal 1');
    });

    it('getDealsByStage returns correct subset', () => {
        const { result } = renderHook(() => useDealFilters({ deals: mockDeals, leads: mockLeads }));
        const newDeals = result.current.getDealsByStage(DealStage.NEW);
        expect(newDeals).toHaveLength(1);
        expect(newDeals[0].stage).toBe(DealStage.NEW);
    });
});
