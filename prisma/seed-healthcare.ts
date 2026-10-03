import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHealthcareData() {
    console.log('🏥 Starting Healthcare Module Data Seed...\n');

    try {
        // Get or create default tenant
        let tenant = await prisma.tenant.findFirst();
        if (!tenant) {
            tenant = await prisma.tenant.create({
                data: {
                    name: 'SLICT Hospital',
                    subdomain: 'hospital',
                    companyName: 'SLICT Healthcare Pvt Ltd',
                    status: 'ACTIVE',
                },
            });
            console.log('✅ Created default tenant');
        }

        const tenantId = tenant.id;

        // 1. Create Sample Lab Tests
        console.log('\n📋 Creating Lab Tests...');
        const labTests = [
            { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', price: 800 },
            { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', price: 400 },
            { code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', price: 1500 },
            { code: 'RFT', name: 'Renal Function Test', category: 'Biochemistry', price: 1200 },
            { code: 'ESR', name: 'Erythrocyte Sedimentation Rate', category: 'Hematology', price: 300 },
            { code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', price: 1800 },
        ];

        for (const test of labTests) {
            const existing = await prisma.labTest.findUnique({
                where: { code: test.code },
            });

            if (!existing) {
                await prisma.labTest.create({
                    data: {
                        ...test,
                        tenantId,
                        isActive: true,
                        resultTemplate: {
                            fields: ['Enter test results here...'],
                        },
                    },
                });
                console.log(`   ✓ ${test.code} - ${test.name}`);
            } else {
                console.log(`   ⏭️  ${test.code} - Already exists`);
            }
        }

        // 2. Create Sample Patients
        console.log('\n👥 Creating Sample Patients...');

        const patients = [
            {
                firstName: 'John',
                lastName: 'Silva',
                dateOfBirth: new Date('1985-06-15'),
                gender: 'MALE',
                phone: '+94771234567',
                bloodGroup: 'O_POSITIVE',
                allergies: 'Penicillin',
                chronicConditions: 'Hypertension',
            },
            {
                firstName: 'Nimal',
                lastName: 'Perera',
                dateOfBirth: new Date('1992-03-22'),
                gender: 'FEMALE',
                phone: '+94777654321',
                bloodGroup: 'B_POSITIVE',
                allergies: null,
                chronicConditions: 'Diabetes Type 2',
            },
            {
                firstName: 'Saman',
                lastName: 'Fernando',
                dateOfBirth: new Date('2015-11-10'),
                gender: 'MALE',
                phone: '+94779876543',
                bloodGroup: 'AB_POSITIVE',
                allergies: 'Peanuts',
                chronicConditions: 'Asthma',
            },
        ];

        const createdPatients = [];
        for (const patientData of patients) {
            const existing = await prisma.patient.findFirst({
                where: { phone: patientData.phone, tenantId },
            });

            if (!existing) {
                // Generate unique patient number
                const count = await prisma.patient.count({ where: { tenantId } });
                const patientNumber = `PHN-${String(count + 1).padStart(6, '0')}`;

                const patient = await prisma.patient.create({
                    data: {
                        ...patientData,
                        patientNumber,
                        tenantId,
                        status: 'ACTIVE',
                    },
                });
                createdPatients.push(patient);
                console.log(`   ✓ ${patient.firstName} ${patient.lastName} (${patient.patientNumber})`);
            } else {
                createdPatients.push(existing);
                console.log(`   ⏭️  ${existing.firstName} ${existing.lastName} - Already exists`);
            }
        }

        // 3. Create Sample Visits with Prescriptions and Lab Orders
        console.log('\n🎫 Creating Sample Visits...');

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const visitCount1 = await prisma.medicalVisit.count({
            where: {
                tenantId,
                visitDate: { gte: startOfDay },
            },
        });

        const visit1Exists = await prisma.medicalVisit.findFirst({
            where: {
                patientId: createdPatients[0].id,
                visitDate: { gte: startOfDay },
            },
        });

        if (!visit1Exists) {
            const visit1 = await prisma.medicalVisit.create({
                data: {
                    patientId: createdPatients[0].id,
                    visitNumber: visitCount1 + 1,
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
                            {
                                medication: 'Paracetamol 500mg',
                                dosage: '1 tablet',
                                frequency: 'TDS',
                                duration: '5 days',
                                quantity: 15,
                                instructions: 'Take after meals',
                                isSignedByDoctor: true,
                                signedAt: new Date(),
                                tenantId,
                            },
                            {
                                medication: 'Ibuprofen 400mg',
                                dosage: '1 tablet',
                                frequency: 'BD',
                                duration: '3 days',
                                quantity: 6,
                                instructions: 'Take with food',
                                isSignedByDoctor: true,
                                signedAt: new Date(),
                                tenantId,
                            },
                        ],
                    },
                },
            });
            console.log(`   ✓ Visit #${visit1.visitNumber} - ${createdPatients[0].firstName} (OPD with Prescriptions)`);
        } else {
            console.log(`   ⏭️  Visit for ${createdPatients[0].firstName} - Already exists`);
        }

        // Visit 2: Nimal Perera - OPD with Lab Orders
        const visitCount2 = await prisma.medicalVisit.count({
            where: {
                tenantId,
                visitDate: { gte: startOfDay },
            },
        });

        const visit2Exists = await prisma.medicalVisit.findFirst({
            where: {
                patientId: createdPatients[1].id,
                visitDate: { gte: startOfDay },
            },
        });

        if (!visit2Exists) {
            const cbcTest = await prisma.labTest.findFirst({
                where: { code: 'CBC', tenantId },
            });

            const fbsTest = await prisma.labTest.findFirst({
                where: { code: 'FBS', tenantId },
            });

            const visit2 = await prisma.medicalVisit.create({
                data: {
                    patientId: createdPatients[1].id,
                    visitNumber: visitCount2 + 1,
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
                            {
                                medication: 'Metformin 500mg',
                                dosage: '1 tablet',
                                frequency: 'BD',
                                duration: '30 days',
                                quantity: 60,
                                instructions: 'Take with breakfast and dinner',
                                isSignedByDoctor: true,
                                signedAt: new Date(),
                                tenantId,
                            },
                        ],
                    },
                },
            });

            // Create lab orders
            if (cbcTest) {
                const labOrderCount = await prisma.labOrder.count({ where: { tenantId } });
                await prisma.labOrder.create({
                    data: {
                        orderNumber: `LAB-${String(labOrderCount + 1).padStart(6, '0')}`,
                        visitId: visit2.id,
                        labTestId: cbcTest.id,
                        status: 'PENDING',
                        tenantId,
                    },
                });
            }

            if (fbsTest) {
                const labOrderCount = await prisma.labOrder.count({ where: { tenantId } });
                await prisma.labOrder.create({
                    data: {
                        orderNumber: `LAB-${String(labOrderCount + 1).padStart(6, '0')}`,
                        visitId: visit2.id,
                        labTestId: fbsTest.id,
                        status: 'PENDING',
                        tenantId,
                    },
                });
            }

            console.log(`   ✓ Visit #${visit2.visitNumber} - ${createdPatients[1].firstName} (OPD with Lab Orders)`);
        } else {
            console.log(`   ⏭️  Visit for ${createdPatients[1].firstName} - Already exists`);
        }

        // Visit 3: Saman Fernando - Pending for admission
        const visitCount3 = await prisma.medicalVisit.count({
            where: {
                tenantId,
                visitDate: { gte: startOfDay },
            },
        });

        const visit3Exists = await prisma.medicalVisit.findFirst({
            where: {
                patientId: createdPatients[2].id,
                visitDate: { gte: startOfDay },
            },
        });

        if (!visit3Exists) {
            const visit3 = await prisma.medicalVisit.create({
                data: {
                    patientId: createdPatients[2].id,
                    visitNumber: visitCount3 + 1,
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
                    tenantId,
                },
            });
            console.log(`   ✓ Visit #${visit3.visitNumber} - ${createdPatients[2].firstName} (Pending Admission)`);
        } else {
            console.log(`   ⏭️  Visit for ${createdPatients[2].firstName} - Already exists`);
        }

        console.log('\n✅ Healthcare data seeding completed successfully!\n');
        console.log('📊 Summary:');
        console.log('   - 6 Lab Tests created/verified');
        console.log('   - 3 Sample patients created/verified');
        console.log('   - 3 Sample visits created/verified');
        console.log('   - Prescriptions and Lab Orders added\n');
        console.log('🚀 You can now start testing the Healthcare module!\n');
        console.log('💡 Tip: Run this script multiple times safely - it checks for existing data\n');

    } catch (error) {
        console.error('❌ Error seeding healthcare data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed function
seedHealthcareData()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
