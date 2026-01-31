


export enum DealStage {
  NEW = 'Novo Lead / Interesse',
  CONTACT = 'Contato Realizado',
  QUALIFIED = 'Elegível / Qualificado',
  PROPOSAL = 'Proposta de Matrícula',
  DECISION = 'Em Decisão',
  WON = 'Matrícula Confirmada',
  LOST = 'Perdido'
}

export enum LeadSource {
  WEBSITE = 'Site',
  LINKEDIN = 'LinkedIn',
  REFERRAL = 'Indicação',
  COLD_CALL = 'Cold Call',
  EVENT = 'Evento'
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'status_change';
  content: string;
  timestamp: string; // ISO date
  leadId?: string;
  dealId?: string;
  performer: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string; // Changed from LeadSource enum to string to support custom sources
  classification?: string; // New field: Classificação (e.g., Quente, Frio)
  desiredCourse?: string; // New field: Curso Desejado

  // STATUS REMOVED: Derived from Deal
  ownerId?: string; // If undefined, it's unassigned
  createdAt: string; // ISO date
  lostReason?: string;
  lastInteraction?: string;
}

export interface Deal {
  id: string;
  leadId: string;
  title: string;
  value: number;
  stage: DealStage;
  probability: number; // 0-100
  expectedCloseDate: string;
  ownerId: string;
  lossReason?: string; // Added specifically for the pipeline rules
}

export interface WaitingListItem {
  id: string;
  leadId: string;
  course: string;
  reason: string;
  notes?: string;
  ownerId: string;
  createdAt: string; // When it entered the waiting list
  originalDealValue?: number; // Snapshot of value
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'sales';
  avatar: string;
  email: string; // Login Identifier
  password?: string; // In a real app, this would be a hash. For this demo, it's the string.
  active: boolean;
  mustChangePassword?: boolean; // Force password change on next login
}

export interface CompanySettings {
  name: string;
  logoUrl: string;
  primaryColor: string;
  currency: string;
  timezone: string;
}