// PHASE 4: Healthcare Module Types

export interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  email?: string;
  contactNumber?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface MedicalAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  appointmentType: string;
  status: string;
  reason?: string;
  notes?: string;
}

export interface VitalSigns {
  temperature?: number;
  bloodPressure?: string;
  heartRate?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  visitDate: Date;
  diagnosis: string;
  symptoms?: string[];
  prescription?: Prescription[];
  labOrders?: LabOrder[];
  notes?: string;
}

export interface Prescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface LabOrder {
  id: string;
  test: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  result?: string;
  notes?: string;
}

export interface MedicalHistory {
  patientId: string;
  chronicConditions?: string[];
  pastSurgeries?: Surgery[];
  medications?: string[];
  allergies?: string[];
  familyHistory?: string[];
}

export interface Surgery {
  procedure: string;
  date: Date;
  hospital?: string;
  surgeon?: string;
  notes?: string;
}
