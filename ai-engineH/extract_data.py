import os
import json
import asyncio
import asyncpg
import ssl
from dotenv import load_dotenv

load_dotenv('../.env')

async def extract():
    database_url = os.getenv('DATABASE_URL')
    disable_ssl = os.getenv('DISABLE_SSL_VERIFY', 'false').lower() == 'true'
    
    if disable_ssl:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    else:
        ctx = ssl.create_default_context()

    # Remove sslmode from URL as asyncpg handles it separately
    if '?' in database_url:
        base_url = database_url.split('?')[0]
    else:
        base_url = database_url

    conn = await asyncpg.connect(
        dsn=base_url,
        ssl=ctx,
        timeout=30
    )
    
    documents = []

    print("Extracting invoices...")
    rows = await conn.fetch("""
        SELECT i.number, i.status, i.total, i."dueDate",
               c.name as customer_name
        FROM "Invoice" i
        LEFT JOIN "Customer" c ON i."customerId" = c.id
        LIMIT 100
    """)
    for row in rows:
        documents.append({
            "source": "Invoice",
            "text": f"Invoice {row['number']}: status={row['status']}, total={row['total']}, due={row['dueDate']}, customer={row['customer_name']}"
        })

    print("Extracting products...")
    rows = await conn.fetch("""
        SELECT name, sku, "stockQty", "salePrice", category
        FROM "Product"
        LIMIT 100
    """)
    for row in rows:
        documents.append({
            "source": "Product",
            "text": f"Product: {row['name']}, SKU={row['sku']}, stock={row['stockQty']}, price={row['salePrice']}, category={row['category']}"
        })

    print("Extracting employees...")
    rows = await conn.fetch("""
        SELECT e."firstName", e."lastName", e.position,
               d.name as department
        FROM "Employee" e
        LEFT JOIN "Department" d ON e."departmentId" = d.id
        LIMIT 100
    """)
    for row in rows:
        documents.append({
            "source": "Employee",
            "text": f"Employee: {row['firstName']} {row['lastName']}, position={row['position']}, department={row['department']}"
        })

    print("Extracting patients...")
    rows = await conn.fetch("""
        SELECT "firstName", "lastName", gender, "bloodGroup"
        FROM "Patient"
        LIMIT 100
    """)
    for row in rows:
        documents.append({
            "source": "Patient",
            "text": f"Patient: {row['firstName']} {row['lastName']}, gender={row['gender']}, bloodGroup={row['bloodGroup']}"
        })

    print("Extracting medical visits...")
    rows = await conn.fetch("""
        SELECT mv.type, mv.status, mv.diagnosis,
               mv."chiefComplaint", p."firstName", p."lastName"
        FROM "MedicalVisit" mv
        LEFT JOIN "Patient" p ON mv."patientId" = p.id
        LIMIT 100
    """)
    for row in rows:
        documents.append({
            "source": "MedicalVisit",
            "text": f"Medical Visit: type={row['type']}, status={row['status']}, diagnosis={row['diagnosis']}, complaint={row['chiefComplaint']}, patient={row['firstName']} {row['lastName']}"
        })

    await conn.close()

    with open('erp_documents.json', 'w') as f:
        json.dump(documents, f, indent=2, default=str)

    print(f"\n✅ Extracted {len(documents)} documents")
    print("Saved to erp_documents.json")

asyncio.run(extract())