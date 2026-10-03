import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';
import { AdmissionCharge } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Process discharge
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: admissionId } = await params;
        const tenant = await getOrCreateDefaultTenant();
        const data = await request.json();

        // Get admission with all charges
        const admission = await prisma.admission.findFirst({
            where: { id: admissionId, tenantId: tenant.id },
            include: {
                bed: true,
                charges: true,
                patient: true,
            },
        });

        if (!admission) {
            return NextResponse.json(
                { error: 'Admission not found' },
                { status: 404 }
            );
        }

        if (admission.status !== 'ADMITTED') {
            return NextResponse.json(
                { error: 'Patient is not currently admitted' },
                { status: 400 }
            );
        }

        // Calculate room charges if not already added
        const admissionDate = new Date(admission.admissionDate);
        const dischargeDate = new Date();
        const days = Math.max(1, Math.ceil((dischargeDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)));
        const roomRate = admission.bed.dailyRate;

        // Check if room charge already exists
        const hasRoomCharge = admission.charges.some((c: AdmissionCharge) => c.chargeType === 'ROOM');

        if (!hasRoomCharge && roomRate > 0) {
            // Add room charge
            await prisma.admissionCharge.create({
                data: {
                    admissionId,
                    chargeType: 'ROOM',
                    description: `Room charges (${days} days @ Rs.${roomRate}/day)`,
                    quantity: days,
                    unitPrice: roomRate,
                    totalAmount: days * roomRate,
                    tenantId: tenant.id,
                },
            });
        }

        // Calculate final total
        const finalCharges = await prisma.admissionCharge.findMany({
            where: { admissionId },
        });

        const totalCharges = finalCharges.reduce((sum: number, c: AdmissionCharge) => sum + c.totalAmount, 0);
        const balanceDue = totalCharges - admission.depositAmount;

        // Update admission with discharge info
        const updatedAdmission = await prisma.admission.update({
            where: { id: admissionId },
            data: {
                status: 'DISCHARGED',
                dischargeDate: dischargeDate,
                dischargeNotes: data.dischargeNotes,
                totalCharges,
            },
        });

        // Release the bed
        await prisma.hospitalBed.update({
            where: { id: admission.bedId },
            data: { status: 'AVAILABLE' },
        });

        // ==========================================
        // INTERNAL BILLING INTEGRATION (Phase 9)
        // ==========================================
        try {
            // 1. Find or Create Customer from Patient
            let customer = await prisma.customer.findFirst({
                where: {
                    email: admission.patient.email || undefined,
                    tenantId: tenant.id
                }
            });

            if (!customer) {
                // If no email, check if we created one with patient number
                if (!admission.patient.email) {
                    const placeholderEmail = `patient-${admission.patient.patientNumber.toLowerCase()}@hospital.local`;
                    customer = await prisma.customer.findFirst({ where: { email: placeholderEmail, tenantId: tenant.id } });
                }
            }

            if (!customer) {
                // Create new customer
                customer = await prisma.customer.create({
                    data: {
                        name: `${admission.patient.firstName} ${admission.patient.lastName}`,
                        email: admission.patient.email || `patient-${admission.patient.patientNumber.toLowerCase()}@hospital.local`,
                        phone: admission.patient.phone,
                        address: admission.patient.address,
                        city: admission.patient.city,
                        type: 'INDIVIDUAL',
                        status: 'ACTIVE',
                        tenantId: tenant.id,
                        notes: `Linked to Patient: ${admission.patient.patientNumber}`
                    }
                });
            }

            // 2. Create Invoice
            const invoiceNumber = `INV-${new Date().getFullYear()}-${admission.admissionNumber}`;

            // Check if invoice already exists (avoid duplicates if re-running)
            const existingInvoice = await prisma.invoice.findUnique({
                where: { number: invoiceNumber }
            });

            if (!existingInvoice) {
                await prisma.invoice.create({
                    data: {
                        number: invoiceNumber,
                        type: 'SALES',
                        status: 'OPEN', // Ready for payment
                        customerId: customer.id,
                        issueDate: new Date(),
                        dueDate: new Date(), // Due immediately upon discharge
                        subtotal: totalCharges,
                        tax: 0, // Assuming tax included or 0 for now
                        discount: 0,
                        total: totalCharges,
                        amountPaid: admission.depositAmount,
                        amountDue: totalCharges - admission.depositAmount,
                        notes: `Discharge Bill for Admission #${admission.admissionNumber}`,
                        tenantId: tenant.id,
                        lines: {
                            create: finalCharges.map((charge: AdmissionCharge) => ({
                                description: charge.description,
                                quantity: charge.quantity,
                                unitPrice: charge.unitPrice,
                                total: charge.totalAmount,
                                tax: 0,
                                discount: 0
                            }))
                        }
                    }
                });

                // Link Invoice to Admission (if field exists, checked in schema it does)
                // Need to update admission again with invoiceId if we have the ID, but created inside.
                // Or better, capture the created invoice.
            }

        } catch (err) {
            console.error('Failed to create internal invoice:', err);
            // Don't fail the whole request, just log it. The admission is already closed.
        }

        return NextResponse.json({
            admission: updatedAdmission,
            summary: {
                admissionDate: admission.admissionDate,
                dischargeDate: dischargeDate,
                daysStayed: days,
                totalCharges,
                depositPaid: admission.depositAmount,
                balanceDue,
                charges: finalCharges,
            },
        });
    } catch (error) {
        console.error('Error processing discharge:', error);
        return NextResponse.json(
            { error: 'Failed to process discharge' },
            { status: 500 }
        );
    }
}
