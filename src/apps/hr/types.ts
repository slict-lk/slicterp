// HR & People Module Types
export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  position: string;
  hireDate: Date;
  terminationDate?: Date;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  departmentId?: string;
  managerId?: string;
  salary?: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  parentId?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  hoursWorked?: number;
}
