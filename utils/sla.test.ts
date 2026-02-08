import { describe, it, expect } from 'vitest';
import { calculateSLA } from './sla.ts';
import { Lead, Activity, DealStage } from '../types.ts';

describe('calculateSLA', () => {
    const mockLead: Lead = {
        id: '1',
        createdAt: new Date().toISOString(), // Default to now
        name: 'Test Lead',
        company: 'Test Co',
        email: 'test@test.com',
        phone: '123',
        source: 'Web'
    };

    const mockDeals: { leadId: string, stage: DealStage }[] = [];
    const mockWaitingList: { leadId: string }[] = [];

    it('should return handled if deal is WON', () => {
        const result = calculateSLA(mockLead, [], [{ leadId: '1', stage: DealStage.WON }], []);
        expect(result.status).toBe('handled');
        expect(result.label).toBe('Finalizado');
    });

    it('should return handled if deal is LOST', () => {
        const result = calculateSLA(mockLead, [], [{ leadId: '1', stage: DealStage.LOST }], []);
        expect(result.status).toBe('handled');
        expect(result.label).toBe('Finalizado');
    });

    it('should return waiting if in Waiting List', () => {
        const result = calculateSLA(mockLead, [], [], [{ leadId: '1' }]);
        expect(result.status).toBe('waiting');
        expect(result.label).toBe('Lista de Espera');
    });

    it('should calculate normalized status based on creation time (no activities)', () => {
        const now = new Date();
        const created10h = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString();
        const lead10h = { ...mockLead, createdAt: created10h };

        const result = calculateSLA(lead10h, [], [], []);
        expect(result.status).toBe('normal');
        expect(result.label).toBe('No prazo');
    });

    it('should warn at exactly 12h (12h to <13h)', () => {
        const now = new Date();
        const created12h = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(); // Exactly 12h
        const lead12h = { ...mockLead, createdAt: created12h };

        const result = calculateSLA(lead12h, [], [], []);
        expect(result.status).toBe('warning');
        expect(result.label).toBe('Atenção');
    });

    it('should warn at 12h 59m', () => {
        const now = new Date();
        const created12h59m = new Date(now.getTime() - (12 * 60 * 60 * 1000 + 59 * 60 * 1000)).toISOString();
        const lead12h59m = { ...mockLead, createdAt: created12h59m };

        const result = calculateSLA(lead12h59m, [], [], []);
        expect(result.status).toBe('warning');
        expect(result.label).toBe('Atenção');
    });

    it('should be overdue at 13h', () => {
        const now = new Date();
        const created13h = new Date(now.getTime() - 13 * 60 * 60 * 1000).toISOString();
        const lead13h = { ...mockLead, createdAt: created13h };

        const result = calculateSLA(lead13h, [], [], []);
        expect(result.status).toBe('overdue');
        expect(result.label).toBe('Atrasado');
    });

    it('should reset SLA with valid activity', () => {
        const now = new Date();
        const created20h = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(); // Overdue if no activity
        const leadOverdue = { ...mockLead, createdAt: created20h };

        // Activity 1 hour ago
        const activityTime = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
        const activities: Activity[] = [{
            id: 'a1',
            type: 'note',
            content: 'Follow up',
            timestamp: activityTime,
            leadId: '1',
            performer: 'User'
        }];

        const result = calculateSLA(leadOverdue, activities, [], []);
        expect(result.status).toBe('normal');
        expect(result.hoursDiff).toBe(1);
    });

    it('should NOT reset SLA with status_change', () => {
        const now = new Date();
        const created20h = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
        const leadOverdue = { ...mockLead, createdAt: created20h };

        // Latest activity is status_change (e.g. 1h ago)
        const activityTime = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
        const activities: Activity[] = [{
            id: 'a1',
            type: 'status_change', // Invalid for reset
            content: 'Moved stage',
            timestamp: activityTime,
            leadId: '1',
            performer: 'User'
        }];

        const result = calculateSLA(leadOverdue, activities, [], []);
        expect(result.status).toBe('overdue');
        expect(result.hoursDiff).toBe(20); // Should use createdAt
    });
});
