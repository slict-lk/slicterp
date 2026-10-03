import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'
dotenv.config()

const connectionString = process.env.DATABASE_URL!
const url = new URL(connectionString)
url.searchParams.delete('sslmode')

const pool = new pg.Pool({
  connectionString: url.toString(),
  max: 2,
  ssl: { rejectUnauthorized: false }
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 Starting ERP Seeding...')

  const tenant = await prisma.tenant.findFirst()
  if (!tenant) {
    console.log('❌ No tenant found.')
    return
  }
  console.log(`✅ Using tenant: ${tenant.name}`)
  const tenantId = tenant.id

  // ============================================
  // TAX CATEGORIES
  // ============================================
  console.log('\n📦 Seeding Tax Categories...')
  const taxes = [
    { name: 'Standard VAT', rate: 18.0, description: 'Standard VAT', isDefault: true },
    { name: 'Tax Exempt', rate: 0.0, description: 'Exempt from tax', isDefault: false },
    { name: 'Reduced VAT', rate: 8.0, description: 'Reduced rate', isDefault: false },
  ]
  for (const tax of taxes) {
    const existing = await prisma.shopTaxCategory.findFirst({
      where: { tenantId, name: tax.name }
    })
    if (!existing) {
      await prisma.shopTaxCategory.create({
        data: { ...tax, tenantId }
      })
      console.log(`  ✅ Created: ${tax.name}`)
    } else {
      console.log(`  ⏭️ Exists: ${tax.name}`)
    }
  }

  // ============================================
  // LAB TESTS
  // ============================================
  console.log('\n🔬 Seeding Lab Tests...')
  const labTests = [
    { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', price: 800 },
    { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', price: 400 },
    { code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', price: 1500 },
    { code: 'RFT', name: 'Renal Function Test', category: 'Biochemistry', price: 1200 },
    { code: 'ESR', name: 'Erythrocyte Sedimentation Rate', category: 'Hematology', price: 300 },
    { code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', price: 1800 },
  ]
  for (const test of labTests) {
    const existing = await prisma.labTest.findUnique({
      where: { code: test.code }
    })
    if (!existing) {
      await prisma.labTest.create({
        data: {
          ...test,
          tenantId,
          isActive: true,
          resultTemplate: { fields: ['Enter test results here...'] }
        }
      })
      console.log(`  ✅ Created: ${test.code} - ${test.name}`)
    } else {
      console.log(`  ⏭️ Exists: ${test.code}`)
    }
  }

  // ============================================
  // HEALTHCARE PATIENTS
  // ============================================
  console.log('\n🏥 Seeding Patients...')
  const patientsData = [
    { firstName: 'John', lastName: 'Silva', dateOfBirth: new Date('1985-06-15'), gender: 'MALE', phone: '+94771234567', bloodGroup: 'O_POSITIVE', allergies: 'Penicillin', chronicConditions: 'Hypertension' },
    { firstName: 'Nimal', lastName: 'Perera', dateOfBirth: new Date('1992-03-22'), gender: 'FEMALE', phone: '+94777654321', bloodGroup: 'B_POSITIVE', allergies: null, chronicConditions: 'Diabetes Type 2' },
    { firstName: 'Saman', lastName: 'Fernando', dateOfBirth: new Date('2015-11-10'), gender: 'MALE', phone: '+94779876543', bloodGroup: 'AB_POSITIVE', allergies: 'Peanuts', chronicConditions: 'Asthma' },
    { firstName: 'Karim', lastName: 'Nasser', dateOfBirth: new Date('1990-01-01'), gender: 'MALE', phone: '0771234500', bloodGroup: 'A+', allergies: null, chronicConditions: null },
    { firstName: 'Layla', lastName: 'Ibrahim', dateOfBirth: new Date('1990-01-01'), gender: 'FEMALE', phone: '0779876500', bloodGroup: 'B+', allergies: null, chronicConditions: null },
  ]

  const createdPatients: any[] = []
  for (const patientData of patientsData) {
    const existing = await prisma.patient.findFirst({
      where: { phone: patientData.phone, tenantId }
    })
    if (!existing) {
      const count = await prisma.patient.count({ where: { tenantId } })
      const patientNumber = `PHN-${String(count + 1).padStart(6, '0')}`
      const patient = await prisma.patient.create({
        data: { ...patientData, patientNumber, tenantId, status: 'ACTIVE' }
      })
      createdPatients.push(patient)
      console.log(`  ✅ Created: ${patient.firstName} ${patient.lastName} (${patientNumber})`)
    } else {
      createdPatients.push(existing)
      console.log(`  ⏭️ Exists: ${existing.firstName} ${existing.lastName}`)
    }
  }

  // ============================================
  // MEDICAL VISITS
  // ============================================
  console.log('\n🎫 Seeding Medical Visits...')
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  if (createdPatients[0]) {
    const visit1Exists = await prisma.medicalVisit.findFirst({
      where: { patientId: createdPatients[0].id, visitDate: { gte: startOfDay } }
    })
    if (!visit1Exists) {
      const count = await prisma.medicalVisit.count({ where: { tenantId } })
      await prisma.medicalVisit.create({
        data: {
          patientId: createdPatients[0].id,
          visitNumber: count + 1,
          visitDate: new Date(),
          type: 'OPD',
          status: 'COMPLETED',
          chiefComplaint: 'Fever and headache for 2 days',
          symptoms: 'High fever, severe headache, body ache',
          diagnosis: 'Viral Fever',
          bloodPressure: '120/80',
          temperature: 101.5,
          pulse: 82,
          weight: 70,
          height: 170,
          isCompleted: true,
          tenantId,
          prescriptions: {
            create: [
              { medication: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'TDS', duration: '5 days', quantity: 15, instructions: 'Take after meals', isSignedByDoctor: true, signedAt: new Date(), tenantId },
              { medication: 'Ibuprofen 400mg', dosage: '1 tablet', frequency: 'BD', duration: '3 days', quantity: 6, instructions: 'Take with food', isSignedByDoctor: true, signedAt: new Date(), tenantId },
            ]
          }
        }
      })
      console.log(`  ✅ Visit created for ${createdPatients[0].firstName} - OPD with Prescriptions`)
    } else {
      console.log(`  ⏭️ Visit exists for ${createdPatients[0].firstName}`)
    }
  }

  if (createdPatients[1]) {
    const visit2Exists = await prisma.medicalVisit.findFirst({
      where: { patientId: createdPatients[1].id, visitDate: { gte: startOfDay } }
    })
    if (!visit2Exists) {
      const count = await prisma.medicalVisit.count({ where: { tenantId } })
      const visit2 = await prisma.medicalVisit.create({
        data: {
          patientId: createdPatients[1].id,
          visitNumber: count + 1,
          visitDate: new Date(),
          type: 'OPD',
          status: 'COMPLETED',
          chiefComplaint: 'Routine diabetes checkup',
          symptoms: 'Increased thirst, frequent urination',
          diagnosis: 'Diabetes Mellitus Type 2 - Follow-up',
          bloodPressure: '135/85',
          temperature: 98.4,
          pulse: 75,
          weight: 65,
          height: 162,
          isCompleted: true,
          tenantId,
          prescriptions: {
            create: [
              { medication: 'Metformin 500mg', dosage: '1 tablet', frequency: 'BD', duration: '30 days', quantity: 60, instructions: 'Take with breakfast and dinner', isSignedByDoctor: true, signedAt: new Date(), tenantId },
            ]
          }
        }
      })

      const cbcTest = await prisma.labTest.findFirst({ where: { code: 'CBC', tenantId } })
      const fbsTest = await prisma.labTest.findFirst({ where: { code: 'FBS', tenantId } })

      if (cbcTest) {
        const labCount = await prisma.labOrder.count({ where: { tenantId } })
        await prisma.labOrder.create({
          data: { orderNumber: `LAB-${String(labCount + 1).padStart(6, '0')}`, visitId: visit2.id, labTestId: cbcTest.id, status: 'PENDING', tenantId }
        })
      }
      if (fbsTest) {
        const labCount = await prisma.labOrder.count({ where: { tenantId } })
        await prisma.labOrder.create({
          data: { orderNumber: `LAB-${String(labCount + 1).padStart(6, '0')}`, visitId: visit2.id, labTestId: fbsTest.id, status: 'PENDING', tenantId }
        })
      }
      console.log(`  ✅ Visit created for ${createdPatients[1].firstName} - OPD with Lab Orders`)
    } else {
      console.log(`  ⏭️ Visit exists for ${createdPatients[1].firstName}`)
    }
  }

  if (createdPatients[2]) {
    const visit3Exists = await prisma.medicalVisit.findFirst({
      where: { patientId: createdPatients[2].id, visitDate: { gte: startOfDay } }
    })
    if (!visit3Exists) {
      const count = await prisma.medicalVisit.count({ where: { tenantId } })
      await prisma.medicalVisit.create({
        data: {
          patientId: createdPatients[2].id,
          visitNumber: count + 1,
          visitDate: new Date(),
          type: 'ETU',
          status: 'RECOMMENDED_ADMISSION',
          chiefComplaint: 'Difficulty breathing, wheezing',
          symptoms: 'Severe shortness of breath, chest tightness',
          diagnosis: 'Acute Asthma Exacerbation',
          bloodPressure: '95/60',
          temperature: 98.8,
          pulse: 95,
          weight: 28,
          height: 130,
          tenantId
        }
      })
      console.log(`  ✅ Visit created for ${createdPatients[2].firstName} - ETU Pending Admission`)
    } else {
      console.log(`  ⏭️ Visit exists for ${createdPatients[2].firstName}`)
    }
  }

  // ============================================
  // DEPARTMENTS
  // ============================================
  console.log('\n🏢 Seeding Healthcare Departments...')
  const departments = [
    { name: 'Emergency', code: 'EMRG-HC' },
    { name: 'Cardiology', code: 'CARD-HC' },
    { name: 'Pediatrics', code: 'PEDI-HC' },
    { name: 'Radiology', code: 'RADI-HC' },
    { name: 'Orthopedics', code: 'ORTH-HC' },
  ]
  const createdDepts: any[] = []
  for (const dept of departments) {
    const existing = await prisma.department.findFirst({
      where: { tenantId, code: dept.code }
    })
    if (!existing) {
      const created = await prisma.department.create({
        data: { ...dept, tenantId }
      })
      createdDepts.push(created)
      console.log(`  ✅ Created: ${dept.name}`)
    } else {
      createdDepts.push(existing)
      console.log(`  ⏭️ Exists: ${dept.name}`)
    }
  }

  // ============================================
  // AI INSIGHTS
  // ============================================
  console.log('\n🤖 Seeding AI Insights...')
  const insights = [
    { type: 'INVENTORY', category: 'ALERT', severity: 'HIGH', title: 'Low Stock Alert', message: '5 products critically low on stock. Immediate reorder recommended.' },
    { type: 'FINANCIAL', category: 'RISK', severity: 'MEDIUM', title: 'Overdue Invoices', message: '3 invoices overdue totaling LKR 45,000. Follow up required.' },
    { type: 'HR', category: 'OPTIMIZATION', severity: 'LOW', title: 'Attendance Pattern', message: 'Attendance rate this month is 94%.' },
    { type: 'SALES', category: 'OPPORTUNITY', severity: 'MEDIUM', title: 'Sales Trend', message: 'Sales increased 12% compared to last month.' },
    { type: 'FINANCIAL', category: 'ALERT', severity: 'HIGH', title: 'Budget Exceeded', message: 'Healthcare department exceeded monthly budget by 8%.' },
  ]

  const existingInsights = await prisma.aIInsight.count({ where: { tenantId } })
  if (existingInsights === 0) {
    for (const insight of insights) {
      await prisma.aIInsight.create({ data: { ...insight, tenantId } })
      console.log(`  ✅ Created: ${insight.title}`)
    }
  } else {
    console.log(`  ⏭️ AI Insights already seeded (${existingInsights} exist)`)
  }

  console.log('\n🎉 Seeding Complete!')
  console.log('📊 Summary: Tax categories, Lab tests, Patients, Medical visits, Departments, AI Insights seeded.')
}

main()
  .then(async () => {
    await pool.end()
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await pool.end()
    await prisma.$disconnect()
    process.exit(1)
  })