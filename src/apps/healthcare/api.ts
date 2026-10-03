// Healthcare Module API Functions - Updated for new schema
import { prisma } from '@/lib/prisma';

// Generate patient number with format PHN-YYYYMMDD-XXX
async function generatePatientNumber(tenantId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Get count of patients created today for this tenant
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const count = await prisma.patient.count({
    where: {
      tenantId,
      createdAt: { gte: startOfDay },
    },
  });

  const sequence = (count + 1).toString().padStart(3, '0');
  return `PHN-${dateStr}-${sequence}`;
}

// Generate daily visit number (token)
async function generateVisitNumber(tenantId: string): Promise<number> {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await prisma.medicalVisit.count({
    where: {
      tenantId,
      visitDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return count + 1;
}

// ============================================================================
// PATIENTS
// ============================================================================

export async function getPatients(tenantId: string) {
  return await prisma.patient.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function getPatientById(id: string, tenantId: string) {
  return await prisma.patient.findFirst({
    where: { id, tenantId },
    include: {
      visits: {
        orderBy: { visitDate: 'desc' },
        take: 10,
        include: {
          prescriptions: true,
          labOrders: true,
        },
      },
      admissions: {
        orderBy: { admissionDate: 'desc' },
        take: 5,
      },
    },
  });
}

interface CreatePatientData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  chronicConditions?: string;
  notificationPreference?: string;
  hasWhatsApp?: boolean;
  tenantId: string;
}

export async function createPatient(data: CreatePatientData) {
  const patientNumber = await generatePatientNumber(data.tenantId);

  return await prisma.patient.create({
    data: {
      patientNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      bloodGroup: data.bloodGroup || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      allergies: data.allergies || null,
      chronicConditions: data.chronicConditions || null,
      notificationPreference: data.notificationPreference || 'WHATSAPP',
      hasWhatsApp: data.hasWhatsApp ?? true,
      tenantId: data.tenantId,
      status: 'ACTIVE',
    },
  });
}

export async function updatePatient(
  id: string,
  data: Partial<CreatePatientData>,
  tenantId: string
) {
  // Ensure date is properly formatted if provided
  const updateData: any = { ...data };
  if (data.dateOfBirth) {
    updateData.dateOfBirth = new Date(data.dateOfBirth);
  }
  delete updateData.tenantId;

  return await prisma.patient.update({
    where: { id },
    data: updateData,
  });
}

export async function searchPatients(query: string, tenantId: string) {
  return await prisma.patient.findMany({
    where: {
      tenantId,
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { patientNumber: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
      ],
    },
    orderBy: { firstName: 'asc' },
    take: 20,
  });
}

// ============================================================================
// MEDICAL VISITS
// ============================================================================

export async function getVisits(tenantId: string, options?: { today?: boolean; status?: string; doctorId?: string }) {
  const where: any = { tenantId };

  if (options?.today) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    where.visitDate = { gte: startOfDay, lte: endOfDay };
  }

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.doctorId) {
    where.doctorId = options.doctorId;
  }

  return await prisma.medicalVisit.findMany({
    where,
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          patientNumber: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
          bloodGroup: true,
          allergies: true,
        },
      },
      doctor: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { visitNumber: 'asc' },
  });
}

export async function getVisitById(id: string, tenantId: string) {
  return await prisma.medicalVisit.findFirst({
    where: { id, tenantId },
    include: {
      patient: true,
      doctor: {
        select: { id: true, name: true },
      },
      prescriptions: true,
      labOrders: {
        include: { labTest: true },
      },
    },
  });
}

interface CreateVisitData {
  patientId: string;
  type: 'OPD' | 'ETU' | 'CLINIC';
  doctorId?: string;
  tenantId: string;
}

export async function createVisit(data: CreateVisitData) {
  const visitNumber = await generateVisitNumber(data.tenantId);

  return await prisma.medicalVisit.create({
    data: {
      visitNumber,
      visitDate: new Date(),
      type: data.type,
      status: 'WAITING',
      patientId: data.patientId,
      doctorId: data.doctorId || null,
      tenantId: data.tenantId,
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          patientNumber: true,
        },
      },
    },
  });
}

export async function updateVisit(
  id: string,
  data: {
    status?: string;
    doctorId?: string | null;
    chiefComplaint?: string;
    symptoms?: string;
    diagnosis?: string;
    notes?: string;
    bloodPressure?: string;
    temperature?: number;
    pulse?: number;
    weight?: number;
    height?: number;
    isCompleted?: boolean;
    completedAt?: Date;
    doctorSignature?: string;
  },
  tenantId: string
) {
  // Filter out undefined values and build update object
  const updateData: Record<string, unknown> = {};

  if (data.status !== undefined) updateData.status = data.status;
  if (data.doctorId !== undefined) updateData.doctorId = data.doctorId;
  if (data.chiefComplaint !== undefined) updateData.chiefComplaint = data.chiefComplaint;
  if (data.symptoms !== undefined) updateData.symptoms = data.symptoms;
  if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.bloodPressure !== undefined) updateData.bloodPressure = data.bloodPressure;
  if (data.temperature !== undefined) updateData.temperature = data.temperature;
  if (data.pulse !== undefined) updateData.pulse = data.pulse;
  if (data.weight !== undefined) updateData.weight = data.weight;
  if (data.height !== undefined) updateData.height = data.height;
  if (data.isCompleted !== undefined) updateData.isCompleted = data.isCompleted;
  if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
  if (data.doctorSignature !== undefined) updateData.doctorSignature = data.doctorSignature;

  return await prisma.medicalVisit.update({
    where: { id },
    data: updateData,
  });
}

// ============================================================================
// PRESCRIPTIONS
// ============================================================================

export async function getPrescriptionsByVisit(visitId: string, tenantId: string) {
  return await prisma.prescription.findMany({
    where: { visitId, tenantId },
    orderBy: { createdAt: 'asc' },
  });
}

interface CreatePrescriptionData {
  visitId: string;
  productId?: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
  tenantId: string;
}

export async function createPrescription(data: CreatePrescriptionData) {
  return await prisma.prescription.create({
    data: {
      visitId: data.visitId,
      productId: data.productId || null,
      medication: data.medication,
      dosage: data.dosage,
      frequency: data.frequency,
      duration: data.duration,
      instructions: data.instructions || null,
      quantity: data.quantity || 1,
      isDispensed: false,
      isSignedByDoctor: false,
      tenantId: data.tenantId,
    },
  });
}

export async function signPrescriptions(visitId: string, tenantId: string) {
  const now = new Date();
  return await prisma.prescription.updateMany({
    where: { visitId, tenantId },
    data: {
      isSignedByDoctor: true,
      signedAt: now,
    },
  });
}

export async function dispensePrescription(id: string, dispensedBy: string, tenantId: string) {
  // First check if the prescription is signed
  const prescription = await prisma.prescription.findFirst({
    where: { id, tenantId },
  });

  if (!prescription) {
    throw new Error('Prescription not found');
  }

  if (!prescription.isSignedByDoctor) {
    throw new Error('Cannot dispense unsigned prescription');
  }

  if (prescription.isDispensed) {
    throw new Error('Prescription already dispensed');
  }

  return await prisma.prescription.update({
    where: { id },
    data: {
      isDispensed: true,
      dispensedAt: new Date(),
      dispensedBy,
    },
  });
}

// ============================================================================
// LAB ORDERS
// ============================================================================

// Generate lab order number
async function generateLabOrderNumber(tenantId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const count = await prisma.labOrder.count({
    where: {
      tenantId,
      createdAt: { gte: startOfDay },
    },
  });

  const sequence = (count + 1).toString().padStart(4, '0');
  return `LAB-${dateStr}-${sequence}`;
}

export async function getLabOrders(tenantId: string, options?: { status?: string; visitId?: string }) {
  const where: any = { tenantId };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.visitId) {
    where.visitId = options.visitId;
  }

  return await prisma.labOrder.findMany({
    where,
    include: {
      labTest: true,
      visit: {
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              patientNumber: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

interface CreateLabOrderData {
  visitId: string;
  labTestId: string;
  priority?: string;
  tenantId: string;
}

export async function createLabOrder(data: CreateLabOrderData) {
  const orderNumber = await generateLabOrderNumber(data.tenantId);

  return await prisma.labOrder.create({
    data: {
      orderNumber,
      visitId: data.visitId,
      labTestId: data.labTestId,
      priority: data.priority || 'NORMAL',
      status: 'PENDING',
      isPaid: false,
      tenantId: data.tenantId,
    },
    include: {
      labTest: true,
    },
  });
}

export async function updateLabOrderResults(
  id: string,
  results: any,
  resultNotes: string | undefined,
  resultEnteredBy: string,
  tenantId: string
) {
  return await prisma.labOrder.update({
    where: { id },
    data: {
      results,
      resultNotes,
      resultEnteredBy,
      resultDate: new Date(),
      status: 'COMPLETED',
    },
  });
}

// ============================================================================
// LAB TESTS (Master)
// ============================================================================

export async function getLabTests(tenantId: string) {
  return await prisma.labTest.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function createLabTest(data: {
  code: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  resultTemplate?: any;
  tenantId: string;
}) {
  return await prisma.labTest.create({
    data: {
      code: data.code,
      name: data.name,
      category: data.category,
      description: data.description || null,
      price: data.price,
      resultTemplate: data.resultTemplate || null,
      isActive: true,
      tenantId: data.tenantId,
    },
  });
}

// ============================================================================
// ANALYTICS (Legacy compatibility)
// ============================================================================

export async function getHealthcareAnalytics(tenantId: string) {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const [totalPatients, todayVisits, weekVisits, waitingCount] = await Promise.all([
    prisma.patient.count({ where: { tenantId } }),
    prisma.medicalVisit.count({
      where: {
        tenantId,
        visitDate: { gte: startOfDay, lte: endOfDay },
      },
    }),
    prisma.medicalVisit.count({
      where: {
        tenantId,
        visitDate: { gte: startOfWeek, lte: endOfDay },
      },
    }),
    prisma.medicalVisit.count({
      where: {
        tenantId,
        visitDate: { gte: startOfDay, lte: endOfDay },
        status: 'WAITING',
      },
    }),
  ]);

  return {
    totalPatients,
    appointmentsToday: todayVisits,
    appointmentsThisWeek: weekVisits,
    averageWaitTime: 0,
    patientSatisfaction: 0,
    waitingCount,
  };
}

// Legacy function compatibility
export async function getAppointments(tenantId: string, date?: Date) {
  // Map to new visits system
  return [];
}
