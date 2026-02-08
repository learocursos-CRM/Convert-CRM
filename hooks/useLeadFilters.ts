import { useState, useMemo } from 'react';
import { Lead } from '../types';

export interface LeadFilters {
    searchTerm: string;
    classification: string;
    course: string;
    status: string; // 'ALL' or specific status
    viewMode: 'queue' | 'history';
    showOnlySLA: boolean;
    ownerId: string; // New filter
}

interface UseLeadFiltersProps {
    leads: Lead[];
    getPipelineStatus: (lead: Lead) => { label: string };
    getSLA: (lead: Lead) => { status: string };
}

export const useLeadFilters = ({ leads, getPipelineStatus, getSLA }: UseLeadFiltersProps) => {
    const [filters, setFilters] = useState<LeadFilters>({
        searchTerm: '',
        classification: '',
        course: '',
        status: 'ALL',
        viewMode: 'queue',
        showOnlySLA: false,
        ownerId: ''
    });

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            // Context/Helper logic moved here via callbacks
            const { label } = getPipelineStatus(lead);
            const isFinished = label === 'Convertido' || label === 'Perdido';

            // View Mode Logic
            if (filters.viewMode === 'queue' && isFinished) return false;
            if (filters.viewMode === 'history' && !isFinished) return false;

            // Status Filter
            const matchesStatus = filters.status === 'ALL' || label === filters.status;

            // Owner Filter (New)
            const matchesOwner = !filters.ownerId || lead.ownerId === filters.ownerId;

            // Search Logic
            const term = filters.searchTerm.toLowerCase();
            const matchesSearch =
                lead.name.toLowerCase().includes(term) ||
                lead.company.toLowerCase().includes(term) ||
                (lead.email || '').toLowerCase().includes(term);

            // Classification & Course Filters (New)
            const matchesClass = !filters.classification || lead.classification === filters.classification;
            const matchesCourse = !filters.course || lead.desiredCourse === filters.course;

            // SLA Filter
            const sla = getSLA(lead);
            const matchesSLA = !filters.showOnlySLA || (sla.status === 'overdue' || sla.status === 'warning');

            return matchesStatus && matchesSearch && matchesClass && matchesCourse && matchesSLA && matchesOwner;
        }).sort((a, b) => {
            // Sort logic (keep existing: new first, unless SLA mode)
            if (filters.showOnlySLA) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [leads, filters, getPipelineStatus, getSLA]);

    const setSearchTerm = (term: string) => setFilters(prev => ({ ...prev, searchTerm: term }));
    const setStatusFilter = (status: string) => setFilters(prev => ({ ...prev, status }));
    const setViewMode = (mode: 'queue' | 'history') => setFilters(prev => ({ ...prev, viewMode: mode }));
    const toggleSLA = () => setFilters(prev => ({ ...prev, showOnlySLA: !prev.showOnlySLA }));
    const setClassification = (cls: string) => setFilters(prev => ({ ...prev, classification: cls }));
    const setCourse = (crs: string) => setFilters(prev => ({ ...prev, course: crs }));
    const setOwnerFilter = (id: string) => setFilters(prev => ({ ...prev, ownerId: id }));

    const clearFilters = () => setFilters({
        searchTerm: '',
        classification: '',
        course: '',
        status: 'ALL',
        viewMode: 'queue',
        showOnlySLA: false,
        ownerId: ''
    });

    const availableCourses = useMemo(() => {
        const courses = new Set(leads.map(l => l.desiredCourse).filter(c => c && c.trim() !== ''));
        return Array.from(courses).sort();
    }, [leads]);

    return {
        filteredLeads,
        filters,
        setSearchTerm,
        setStatusFilter,
        setViewMode,
        toggleSLA,
        setClassification,
        setCourse,
        setOwnerFilter, // New export
        clearFilters,
        availableCourses
    };
};
