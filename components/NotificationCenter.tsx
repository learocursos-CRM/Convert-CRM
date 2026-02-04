import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Bell, AlertTriangle, Clock, UserPlus, X, CheckCircle2 } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useNavigate } from 'react-router-dom';

const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'agora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `há ${days} dias`;
    return date.toLocaleDateString('pt-BR');
};

type NotificationType = 'critical' | 'warning' | 'info';

interface NotificationItem {
    id: string; // Unique ID (e.g., lead-id-sla)
    leadId: string;
    type: NotificationType;
    title: string;
    description: string;
    timestamp: string;
    actionRoute: string;
}

export const NotificationCenter = () => {
    const { leads, getLeadSLA, currentUser } = useCRM();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Derived Notifications logic
    const notifications = useMemo(() => {
        const list: NotificationItem[] = [];
        if (!currentUser) return [];

        // 1. SLA Analysis
        leads.forEach(lead => {
            const sla = getLeadSLA(lead);

            if (sla.status === 'overdue') {
                list.push({
                    id: `${lead.id}-sla-overdue`,
                    leadId: lead.id,
                    type: 'critical',
                    title: 'SLA Estourado',
                    description: `${lead.name} está atrasado há ${sla.hoursDiff}h`,
                    timestamp: lead.createdAt || new Date().toISOString(), // Fallback
                    actionRoute: `/leads?highlight=${lead.id}` // Ideally filter or open modal
                });
            } else if (sla.status === 'warning') {
                list.push({
                    id: `${lead.id}-sla-warning`,
                    leadId: lead.id,
                    type: 'warning',
                    title: 'SLA - Atenção',
                    description: `${lead.name} vence em breve (${sla.hoursDiff}h decorridas)`,
                    timestamp: lead.createdAt || new Date().toISOString(),
                    actionRoute: `/leads?highlight=${lead.id}`
                });
            }

            // 2. New Lead Analysis (< 24h)
            const created = new Date(lead.createdAt);
            const hoursSinceCreation = (new Date().getTime() - created.getTime()) / (1000 * 60 * 60);

            if (hoursSinceCreation < 24 && sla.status !== 'handled') {
                const isSlaListed = list.some(n => n.leadId === lead.id && (n.type === 'critical' || n.type === 'warning'));
                if (!isSlaListed) {
                    list.push({
                        id: `${lead.id}-new`,
                        leadId: lead.id,
                        type: 'info',
                        title: 'Novo Lead',
                        description: `${lead.name} chegou recentemente`,
                        timestamp: lead.createdAt,
                        actionRoute: `/leads?highlight=${lead.id}`
                    });
                }
            }
        });

        // Sort: Critical first, then Warning, then Newest Info
        return list.sort((a, b) => {
            const score = (t: NotificationType) => {
                if (t === 'critical') return 3;
                if (t === 'warning') return 2;
                return 1;
            };
            const scoreDiff = score(b.type) - score(a.type);
            if (scoreDiff !== 0) return scoreDiff;
            // Descending time (newest first)
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    }, [leads, getLeadSLA, currentUser]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (notification: NotificationItem) => {
        setIsOpen(false);
        navigate(notification.actionRoute);
    };

    const hasNotifications = notifications.length > 0;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-full transition-colors ${isOpen ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'}`}
            >
                <Bell size={20} />
                {hasNotifications && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden transform origin-top-right transition-all">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900 text-sm">Notificações</h3>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                            {notifications.length} pendentes
                        </span>
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="bg-gray-50 p-3 rounded-full mb-3">
                                    <CheckCircle2 className="text-gray-400" size={32} />
                                </div>
                                <p className="text-gray-900 font-medium text-sm">Tudo em dia!</p>
                                <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                                    Você não possui pendências ou alertas no momento.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleItemClick(item)}
                                        className="flex gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            {item.type === 'critical' && <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={18} /></div>}
                                            {item.type === 'warning' && <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={18} /></div>}
                                            {item.type === 'info' && <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UserPlus size={18} /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    {item.title}
                                                </p>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                    {formatTimeAgo(item.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
                            <p className="text-[10px] text-gray-400">
                                As notificações desaparecem automaticamente ou ao serem resolvidas.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
