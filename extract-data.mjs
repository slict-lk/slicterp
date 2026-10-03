import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()

const connectionString = process.env.DATABASE_URL
const url = new URL(connectionString)
url.searchParams.delete('sslmode')

const pool = new pg.Pool({
  connectionString: url.toString(),
  max: 2,
  ssl: { rejectUnauthorized: false }
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function extract() {
  const documents = []

  console.log('Extracting invoices...')
  const invoices = await prisma.invoice.findMany({
    include: { customer: true },
    take: 100
  })
  for (const inv of invoices) {
    documents.push({
      source: 'Invoice',
      text: `Invoice ${inv.number}: status=${inv.status}, total=${inv.total}, due=${inv.dueDate}, customer=${inv.customer?.name}`
    })
  }

  console.log('Extracting products...')
  const products = await prisma.product.findMany({ take: 100 })
  for (const p of products) {
    documents.push({
      source: 'Product',
      text: `Product: ${p.name}, SKU=${p.sku}, stock=${p.stockQty}, price=${p.salePrice}, category=${p.category}`
    })
  }

  console.log('Extracting employees...')
  const employees = await prisma.employee.findMany({
    include: { department: true },
    take: 100
  })
  for (const e of employees) {
    documents.push({
      source: 'Employee',
      text: `Employee: ${e.firstName} ${e.lastName}, position=${e.position}, department=${e.department?.name}`
    })
  }

  console.log('Extracting patients...')
  const patients = await prisma.patient.findMany({ take: 100 })
  for (const p of patients) {
    documents.push({
      source: 'Patient',
      text: `Patient: ${p.firstName} ${p.lastName}, gender=${p.gender}, bloodGroup=${p.bloodGroup}`
    })
  }

  console.log('Extracting medical visits...')
  const visits = await prisma.medicalVisit.findMany({
    include: { patient: true },
    take: 100
  })
  for (const v of visits) {
    documents.push({
      source: 'MedicalVisit',
      text: `Medical Visit: type=${v.type}, status=${v.status}, diagnosis=${v.diagnosis}, patient=${v.patient?.firstName} ${v.patient?.lastName}`
    })
  }

  fs.writeFileSync('ai-engineH/erp_documents.json',
    JSON.stringify(documents, null, 2))

  console.log(`\n✅ Extracted ${documents.length} documents`)
  console.log('Saved to ai-engineH/erp_documents.json')

  await pool.end()
  await prisma.$disconnect()
}

extract().catch(console.error)