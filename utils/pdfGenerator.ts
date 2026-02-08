import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Lead, User } from '../types';

interface GenerateLeadsPDFProps {
    leads: Lead[];
    users: User[];
    getPipelineStatus: (lead: Lead) => { label: string };
    getSLA: (lead: Lead) => { label: string };
}

export const generateLeadsPDF = ({ leads, users, getPipelineStatus, getSLA }: GenerateLeadsPDFProps) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text('Relatório de Leads', 14, 22);

    // Metadata (Date/Time)
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleString('pt-BR');
    doc.text(`Gerado em: ${dateStr}`, 14, 30);
    doc.text(`Total de registros: ${leads.length}`, 14, 35);

    // Table Data
    const tableData = leads.map(lead => {
        const pipeline = getPipelineStatus(lead);
        const sla = getSLA(lead);
        const owner = users.find(u => u.id === lead.ownerId)?.name || 'N/A';

        // Contact info: Prefer phone, fallback to email, or empty if neither
        const contact = [lead.phone, lead.email].filter(Boolean).join('\n');

        return [
            lead.name,
            contact,
            lead.desiredCourse || '-',
            pipeline.label,
            sla.label,
            owner,
            new Date(lead.createdAt).toLocaleDateString('pt-BR')
        ];
    });

    // Generate Table
    autoTable(doc, {
        head: [['Nome', 'Contato', 'Curso', 'Status', 'SLA', 'Responsável', 'Data Entrada']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600 to match theme roughly
        columnStyles: {
            0: { cellWidth: 30 }, // Name
            1: { cellWidth: 40 }, // Contact
            2: { cellWidth: 25 }, // Course
            3: { cellWidth: 25 }, // Status
            4: { cellWidth: 20 }, // SLA
            5: { cellWidth: 25 }, // Responsible
            6: { cellWidth: 20 }  // Date
        }
    });

    // Download
    const fileName = `leads_export_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};
