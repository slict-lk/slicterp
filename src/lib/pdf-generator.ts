import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface HospitalInfo {
    name: string;
    address: string;
    phone: string;
    email: string;
}

const defaultHospital: HospitalInfo = {
    name: 'Quick Care Hospital',
    address: '123 Main Street, Colombo 03',
    phone: '+94 11 234 5678',
    email: 'info@quickcare.lk',
};

// Base configuration for PDF generation
const createBasePDF = (title: string, orientation: 'p' | 'l' = 'p', format: string | number[] = 'a4') => {
    const doc = new jsPDF(orientation, 'mm', format);
    const width = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(defaultHospital.name, width / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(defaultHospital.address, width / 2, 21, { align: 'center' });
    doc.text(`Tel: ${defaultHospital.phone}`, width / 2, 26, { align: 'center' });

    // Line separator
    doc.setLineWidth(0.5);
    doc.line(10, 32, width - 10, 32);

    // Title
    if (title) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, width / 2, 42, { align: 'center' });
    }

    return { doc, width };
};

// ==========================================
// 1. Token Slip (Thermal Printer Friendly)
// ==========================================
export const generateTokenSlipPDF = (data: {
    tokenNumber: number;
    patientName: string;
    patientNumber: string;
    visitType: string;
    date: Date;
}) => {
    // Thermal paper width is usually 80mm or 58mm. We'll use 80mm width, auto height
    const doc = new jsPDF('p', 'mm', [80, 150]);
    const width = 80;

    // Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(defaultHospital.name, width / 2, 10, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(format(data.date, 'dd MMM yyyy, hh:mm a'), width / 2, 15, { align: 'center' });

    // Token Number (Big)
    doc.setFontSize(10);
    doc.text('TOKEN NUMBER', width / 2, 25, { align: 'center' });

    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text(data.tokenNumber.toString(), width / 2, 38, { align: 'center' });

    // Patient Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Patient Name:', 5, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(data.patientName, 5, 55);

    doc.setFont('helvetica', 'normal');
    doc.text('PHN:', 5, 62);
    doc.text(data.patientNumber, 25, 62);

    doc.text('Visit Type:', 5, 67);
    doc.text(data.visitType, 25, 67);

    // Footer
    doc.setFontSize(8);
    doc.text('Please wait for your number', width / 2, 80, { align: 'center' });
    doc.text('*** END ***', width / 2, 85, { align: 'center' });

    // Auto-print
    doc.autoPrint();
    const blob = doc.output('bloburl');
    window.open(blob, '_blank');
};

// ==========================================
// 2. Prescription Slip
// ==========================================
export const generatePrescriptionPDF = (data: {
    patient: { name: string; age?: number | string; gender?: string; patientNumber: string };
    doctorName: string;
    date: Date;
    prescriptions: Array<{
        medication: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions: string | null;
    }>;
}) => {
    const { doc, width } = createBasePDF('PRESCRIPTION', 'p', 'a5'); // A5 is good for prescriptions

    // Patient Info Frame
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const startY = 50;
    doc.text(`Patient: ${data.patient.name}`, 15, startY);
    doc.text(`Age/Gender: ${data.patient.age || '-'}/${data.patient.gender || '-'}`, 15, startY + 6);
    doc.text(`PHN: ${data.patient.patientNumber}`, width - 60, startY);
    doc.text(`Date: ${format(data.date, 'dd MMM yyyy')}`, width - 60, startY + 6);

    doc.text(`Doctor: Dr. ${data.doctorName}`, 15, startY + 12);

    // Rx Symbol
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Rx', 15, startY + 22);

    // Table
    autoTable(doc, {
        startY: startY + 25,
        head: [['Medication', 'Dosage', 'Freq', 'Duration', 'Instructions']],
        body: data.prescriptions.map(p => [
            p.medication,
            p.dosage,
            p.frequency,
            p.duration,
            p.instructions || '-'
        ]),
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 20 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 'auto' }
        }
    });

    // Footer / Signature
    const finalY = (doc as any).lastAutoTable.finalY + 30;

    doc.setFontSize(10);
    doc.line(width - 60, finalY, width - 10, finalY);
    doc.text('Doctor\'s Signature', width - 35, finalY + 5, { align: 'center' });

    // Save
    doc.save(`Prescription_${data.patient.patientNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

// ==========================================
// 3. Lab Report
// ==========================================
export const generateLabReportPDF = (data: {
    patient: { name: string; age?: number | string; gender?: string; patientNumber: string };
    testName: string;
    resultDate: Date;
    results: string;
    enteredBy: string;
}) => {
    const { doc, width } = createBasePDF('LABORATORY REPORT', 'p', 'a4');

    // Patient Info Frame
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const startY = 50;
    doc.rect(10, startY - 5, width - 20, 25); // Box around patient info

    doc.text(`Patient Name: ${data.patient.name}`, 15, startY);
    doc.text(`PHN: ${data.patient.patientNumber}`, width / 2 + 10, startY);

    doc.text(`Age/Gender: ${data.patient.age || '-'}/${data.patient.gender || '-'}`, 15, startY + 8);
    doc.text(`Report Date: ${format(data.resultDate, 'dd MMM yyyy, hh:mm a')}`, width / 2 + 10, startY + 8);

    doc.text(`Ref. Doctor: -`, 15, startY + 16);

    // Test Name Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(10, startY + 25, width - 20, 10, 'F');
    doc.text(data.testName, 15, startY + 32);

    // Results Content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const resultTextArray = doc.splitTextToSize(data.results, width - 30);
    doc.text(resultTextArray, 15, startY + 45);

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(10);
    doc.text(`Authorized By: ${data.enteredBy}`, 15, pageHeight - 40);
    doc.text('Lab Technician', 15, pageHeight - 35);

    doc.setLineWidth(0.2);
    doc.line(10, pageHeight - 25, width - 10, pageHeight - 25);
    doc.setFontSize(8);
    doc.text('This report is electronically generated.', width / 2, pageHeight - 20, { align: 'center' });

    // Save
    doc.save(`LabReport_${data.testName}_${data.patient.patientNumber}.pdf`);
};
