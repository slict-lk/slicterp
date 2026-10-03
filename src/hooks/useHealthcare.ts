'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Patient, MedicalAppointment } from '@/apps/healthcare/types';

export function useHealthcare() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<MedicalAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [patientsData, appointmentsData] = await Promise.all([
        apiClient.get<Patient[]>('/healthcare/patients'),
        apiClient.get<MedicalAppointment[]>('/healthcare/appointments'),
      ]);
      setPatients(patientsData);
      setAppointments(appointmentsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createPatient = async (data: Partial<Patient>) => {
    const patient = await apiClient.post<Patient>('/healthcare/patients', data);
    setPatients([...patients, patient]);
    return patient;
  };

  const createAppointment = async (data: Partial<MedicalAppointment>) => {
    const appointment = await apiClient.post<MedicalAppointment>('/healthcare/appointments', data);
    setAppointments([...appointments, appointment]);
    return appointment;
  };

  return {
    patients,
    appointments,
    loading,
    error,
    createPatient,
    createAppointment,
    reload: loadData,
  };
}
