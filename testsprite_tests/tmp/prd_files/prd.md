# Product Requirements Document (PRD) - Convert CRM

## 1. Introduction
Convert CRM is a specialized Customer Relationship Management system developed for educational institutions to manage the student enrollment process. It streamlines the flow from initial Lead interest to confirmed Enrollment (Deal Won), including a specific Waiting List mechanism.

## 2. User Roles
- **Admin**: Full system access, including User Management and Company Settings.
- **Sales**: Operational access to Leads, Deals (Kanban), and Waiting List.

## 3. Functional Requirements

### 3.1 Authentication & Security
- **Login**: Users must authenticate via Email and Password.
- **Force Password Change**: Users flagged with `mustChangePassword` are forced to update their credentials upon login.
- **Session Management**: Protected routes redirect unauthenticated users to `/login`.

### 3.2 Dashboard
- Provides a high-level overview of sales performance.
- Key Metrics: Total Active Leads, value in pipeline, conversion rates (implied).

### 3.3 Lead Management
- **List View**: Display database of potential students.
- **Fields**: Name, Company, Email, Phone, Source (Website, LinkedIn, Referral, etc.), Classification (Hot/Cold), Desired Course.
- **Virtualization**: Uses `react-window` for efficient rendering of large lists.

### 3.4 Deals & Pipeline (Kanban)
- **Visual Pipeline**: managing Deals through specific stages:
  1. **Novo Lead / Interesse** (New)
  2. **Contato Realizado** (Contacted)
  3. **Elegível / Qualificado** (Qualified)
  4. **Proposta de Matrícula** (Proposal)
  5. **Em Decisão** (Decision)
  6. **Matrícula Confirmada** (Won)
  7. **Perdido** (Lost)
- **Actions**: Drag-and-drop deals between stages.
- **Deal Data**: Title, Value, Probability, Expected Close Date, Loss Reason.

### 3.5 Waiting List
- Specialized queue for students who cannot be enrolled immediately (e.g., full classes).
- **Data**: Course, Reason, Notes, Original Deal Value.

### 3.6 Reports
- Data visualization for sales performance and enrollment statistics.
- Export capabilities (PDF/Excel inferred from package.json dependencies).

### 3.7 Settings
- **Company Profile**: Name, Logo, Primary Color, Currency, Timezone.
- **User Management**: Create and manage system users (Admin/Sales).

## 4. Technical Specifications
- **Stack**: React 19, Vite, TypeScript.
- **Routing**: React Router v7.
- **UI Library**: Tailwind CSS, Lucide React (Icons).
- **State**: Context API (`CRMContext`).
- **Testing**: Vitest, React Testing Library.
