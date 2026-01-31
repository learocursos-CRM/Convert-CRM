
import { Lead, Deal, Activity, User, DealStage, LeadSource, WaitingListItem } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Carlos Silva',
    email: 'carlos@convert.com',
    password: '123', // Demo password
    role: 'sales',
    avatar: 'https://picsum.photos/id/1005/200/200',
    active: true,
    mustChangePassword: true
  },
  {
    id: 'u2',
    name: 'Ana Souza',
    email: 'ana@convert.com',
    password: 'admin', // Demo password
    role: 'admin',
    avatar: 'https://picsum.photos/id/1011/200/200',
    active: true,
    mustChangePassword: false
  },
  {
    id: 'u3',
    name: 'Roberto Mendes',
    email: 'roberto@convert.com',
    password: '123', // Demo password
    role: 'sales',
    avatar: 'https://picsum.photos/id/1027/200/200',
    active: true,
    mustChangePassword: true
  },
];

export const MOCK_LEADS: Lead[] = [
  {
    id: 'l1',
    name: 'Fernanda Lima',
    company: 'TechSolutions Ltda',
    email: 'fernanda@techsolutions.com',
    phone: '(11) 99999-1234',
    source: LeadSource.WEBSITE,
    // status: LeadStatus.IN_PROGRESS, // Removed (Derived)
    ownerId: 'u1',
    desiredCourse: 'MBA em Gestão de Projetos',
    classification: 'Trabalhador vinculado à empresa do transporte',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    lastInteraction: new Date().toISOString()
  },
  {
    id: 'l2',
    name: 'João Pedro',
    company: 'Inova Retail',
    email: 'joao@inovaretail.com.br',
    phone: '(21) 98888-5678',
    source: LeadSource.LINKEDIN,
    // status: LeadStatus.NEW, // Removed (Derived)
    desiredCourse: 'Técnico em Logística',
    classification: 'Comunidade',
    ownerId: 'u1', // Assigned to Carlos to match Deal
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'l3',
    name: 'Mariana Costa',
    company: 'Logística Express',
    email: 'mariana@logex.com',
    phone: '(31) 97777-4321',
    source: LeadSource.REFERRAL,
    // status: LeadStatus.CONVERTED, // Removed (Derived)
    desiredCourse: 'Curso de Direção Defensiva',
    classification: 'Dependente de trabalhador vinculado à empresa do transporte',
    ownerId: 'u2',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'l4',
    name: 'Ricardo Oliveira',
    company: 'AgroFuture',
    email: 'ricardo@agrofuture.com',
    phone: '(62) 99666-1111',
    source: LeadSource.EVENT,
    desiredCourse: 'Gestão de Frotas',
    classification: 'Comunidade',
    ownerId: 'u3',
    lostReason: 'Orçamento insuficiente',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'l5',
    name: 'Juliana Paes',
    company: 'Particular',
    email: 'juliana@email.com',
    phone: '(11) 97777-1111',
    source: LeadSource.WEBSITE,
    // status: LeadStatus.IN_PROGRESS, // Removed (Derived)
    desiredCourse: 'Mecânica Diesel',
    classification: 'Comunidade',
    ownerId: 'u1',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  }
];

export const MOCK_DEALS: Deal[] = [
  {
    id: 'd1',
    leadId: 'l3',
    title: 'Matrícula: Mariana Costa',
    value: 1200,
    stage: DealStage.DECISION,
    probability: 80,
    expectedCloseDate: '2023-12-15',
    ownerId: 'u2'
  },
  {
    id: 'd2',
    leadId: 'l1',
    title: 'Matrícula: Fernanda Lima',
    value: 15000, // MBA
    stage: DealStage.PROPOSAL,
    probability: 50,
    expectedCloseDate: '2023-11-30',
    ownerId: 'u1'
  },
  {
    id: 'd3',
    leadId: 'l4',
    title: 'Matrícula: Ricardo Oliveira',
    value: 800,
    stage: DealStage.LOST,
    probability: 0,
    expectedCloseDate: '2023-10-10',
    ownerId: 'u3',
    lossReason: 'Preço'
  },
  {
    id: 'd4',
    leadId: 'l2', // João Pedro
    title: 'Matrícula: João Pedro',
    value: 0,
    stage: DealStage.NEW,
    probability: 10,
    expectedCloseDate: '2023-12-20',
    ownerId: 'u1'
  }
];

export const MOCK_WAITING_LIST: WaitingListItem[] = [
  {
    id: 'w1',
    leadId: 'l5',
    course: 'Mecânica Diesel',
    reason: 'Turma fechada - Aguardando 2026',
    notes: 'Interessada no período noturno apenas.',
    ownerId: 'u1',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    originalDealValue: 1500
  }
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    type: 'call',
    content: 'Ligação de qualificação realizada. Interessado no módulo noturno.',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    leadId: 'l1',
    performer: 'Carlos Silva'
  },
  {
    id: 'a2',
    type: 'status_change',
    content: 'Avançou para Proposta de Matrícula',
    timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    leadId: 'l1',
    performer: 'Carlos Silva'
  }
];