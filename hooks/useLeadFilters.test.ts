import { renderHook, act } from '@testing-library/react';
import { useLeadFilters } from './useLeadFilters';
import { describe, it, expect, vi } from 'vitest';
import { Lead } from '../types';

describe('useLeadFilters', () => {
    const mockLeads: Lead[] = [
        { id: '1', name: 'Alice', company: 'Wonderland', email: 'alice@test.com', createdAt: '2023-01-01', source: 'Web' },
        { id: '2', name: 'Bob', company: 'Builder', email: 'bob@test.com', createdAt: '2023-01-02', classification: 'VIP', source: 'Ref' },
        { id: '3', name: 'Charlie', company: 'Chocolate', email: 'charlie@test.com', createdAt: '2023-01-03', desiredCourse: 'React', source: 'Web' },
    ] as Lead[];

    const mockGetPipelineStatus = vi.fn((lead) => ({ label: 'Novo Lead' }));
    const mockGetSLA = vi.fn((lead) => ({ status: 'ok' }));

    it('returns all leads by default', () => {
        const { result } = renderHook(() => useLeadFilters({
            leads: mockLeads,
            getPipelineStatus: mockGetPipelineStatus,
            getSLA: mockGetSLA
        }));
        expect(result.current.filteredLeads).toHaveLength(3);
    });

    it('filters by search term', () => {
        const { result } = renderHook(() => useLeadFilters({
            leads: mockLeads,
            getPipelineStatus: mockGetPipelineStatus,
            getSLA: mockGetSLA
        }));

        act(() => {
            result.current.setSearchTerm('Wonderland');
        });

        expect(result.current.filteredLeads).toHaveLength(1);
        expect(result.current.filteredLeads[0].name).toBe('Alice');
    });

    it('filters by status', () => {
        const statusMock = vi.fn((lead) => ({ label: lead.name === 'Alice' ? 'Convertido' : 'Novo Lead' }));
        const { result } = renderHook(() => useLeadFilters({
            leads: mockLeads,
            getPipelineStatus: statusMock,
            getSLA: mockGetSLA
        }));

        // Default viewMode is 'queue', which excludes 'Convertido'
        expect(result.current.filteredLeads).toHaveLength(2); // Bob & Charlie

        // Switch to history
        act(() => {
            result.current.setViewMode('history');
        });
        expect(result.current.filteredLeads).toHaveLength(1); // Alice
    });

    it('filters by classification', () => {
        const { result } = renderHook(() => useLeadFilters({
            leads: mockLeads,
            getPipelineStatus: mockGetPipelineStatus,
            getSLA: mockGetSLA
        }));

        act(() => {
            result.current.setClassification('VIP');
        });
        expect(result.current.filteredLeads).toHaveLength(1);
        expect(result.current.filteredLeads[0].name).toBe('Bob');
    });

    it('filters by ownerId', () => {
        const leadsWithOwner = [
            { ...mockLeads[0], ownerId: 'user1' },
            { ...mockLeads[1], ownerId: 'user2' },
            { ...mockLeads[2], ownerId: 'user1' }
        ];

        const { result } = renderHook(() => useLeadFilters({
            leads: leadsWithOwner,
            getPipelineStatus: mockGetPipelineStatus,
            getSLA: mockGetSLA
        }));

        // Default: All
        expect(result.current.filteredLeads).toHaveLength(3);

        // Filter by user1
        act(() => {
            result.current.setOwnerFilter('user1');
        });
        expect(result.current.filteredLeads).toHaveLength(2);
        expect(result.current.filteredLeads.every(l => l.ownerId === 'user1')).toBe(true);

        // Filter by user2 (Owner of Lead 2 'Bob')
        act(() => {
            result.current.setOwnerFilter('user2');
        });
        expect(result.current.filteredLeads).toHaveLength(1);
        expect(result.current.filteredLeads[0].id).toBe('2');

        // Clear
        act(() => {
            result.current.setOwnerFilter('');
        });
        expect(result.current.filteredLeads).toHaveLength(3);
    });
});
