import { useState, useMemo } from 'react';
import { Deal, Lead } from '../types';

interface UseDealFiltersProps {
    deals: Deal[];
    leads: Lead[]; // Needed to search by Lead Name
}

export const useDealFilters = ({ deals, leads }: UseDealFiltersProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    // Stage filtering is typically handled by the Kanban columns themselves in the view, 
    // but we can provide helper to filter specific list if needed.
    // The previous Deals.tsx filtered 'by stage' per column.
    // We will keep the 'global search' logic here which applies to ALL columns.

    // If we want this hook to return the *processed* deals ready for columns, 
    // it ideally returns the same list but filtered by search.
    // The column separation logic stays in the UI or we provide a helper here.

    const filteredDeals = useMemo(() => {
        if (!searchTerm) return deals;
        const term = searchTerm.toLowerCase();

        return deals.filter(deal => {
            const lead = leads.find(l => l.id === deal.leadId);
            return (deal.title ?? "").toLowerCase().includes(term) ||
                (lead?.name ?? "").toLowerCase().includes(term) ||
                (lead?.company ?? "").toLowerCase().includes(term);
        });
    }, [deals, leads, searchTerm]);

    const getDealsByStage = (stage: string) => {
        return filteredDeals.filter(d => d.stage === stage);
    };

    return {
        filteredDeals,
        searchTerm,
        setSearchTerm,
        getDealsByStage
    };
};
