import { prisma } from '@/lib/prisma';
import {
  CreateModuleInput, UpdateModuleInput, CreateFieldInput, UpdateFieldInput,
  ModuleFilters, RecordFilters, PaginatedResponse, CustomRecord
} from './types';
import { Prisma } from '@prisma/client';

// ----------------------------------------------------------------------------
// CUSTOM MODULES
// ----------------------------------------------------------------------------

export async function getCustomModules(
  tenantId: string,
  filters?: ModuleFilters
) {
  const { skip = 0, take = 50, search, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = filters || {};

  const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'slug'];
  const safeSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : 'createdAt';

  const where: Prisma.CustomModuleWhereInput = {
    tenantId,
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [count, data] = await Promise.all([
    prisma.customModule.count({ where }),
    prisma.customModule.findMany({
      where,
      skip,
      take,
      orderBy: { [safeSortBy]: sortOrder },
      include: {
        _count: { select: { records: true, fields: true } },
      },
    }),
  ]);

  return { data, count, skip, take };
}

export async function getCustomModuleBySlug(tenantId: string, slug: string) {
  return prisma.customModule.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    include: {
      fields: { orderBy: { sequence: 'asc' } },
      _count: { select: { records: true } },
    },
  });
}

export async function getCustomModuleById(tenantId: string, id: string) {
  return prisma.customModule.findFirst({
    where: { id, tenantId },
    include: {
      fields: { orderBy: { sequence: 'asc' } },
    },
  });
}

export async function createCustomModule(tenantId: string, input: CreateModuleInput, createdById?: string) {
  // Auto-generate slug
  const baseSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.customModule.findUnique({ where: { tenantId_slug: { tenantId, slug } } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  // Define default system fields
  const systemFields = [
    { name: 'created_at', label: 'Created At', type: 'date', isSystem: true, required: false, sequence: 999 },
    { name: 'updated_at', label: 'Updated At', type: 'date', isSystem: true, required: false, sequence: 1000 },
  ];

  const fieldsToCreate = [...(input.fields || []), ...systemFields].map((f, i) => ({
    ...f,
    sequence: f.sequence ?? i,
  }));

  return prisma.customModule.create({
    data: {
      tenantId,
      name: input.name,
      slug,
      icon: input.icon || 'database',
      description: input.description,
      isActive: input.isActive ?? true,
      schema: input.schema || { fields: [], relations: [] },
      views: (input.views || []) as any,
      settings: input.settings || {},
      createdById,
      fields: {
        create: fieldsToCreate.map(f => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: f.required ?? false,
          defaultValue: (f as any).defaultValue,
          options: (f as any).options ?? undefined,
          validation: (f as any).validation ?? undefined,
          sequence: f.sequence,
          isSystem: f.isSystem ?? false,
          settings: (f as any).settings ?? undefined,
        })),
      },
    },
    include: { fields: true },
  });
}

export async function updateCustomModule(id: string, tenantId: string, data: UpdateModuleInput) {
  return prisma.customModule.updateMany({
    where: { id, tenantId },
    data: {
      name: data.name,
      icon: data.icon,
      description: data.description,
      isActive: data.isActive,
      schema: data.schema as any,
      views: data.views as any,
      settings: data.settings as any,
    },
  });
}

export async function deleteCustomModule(id: string, tenantId: string) {
  // Cascade is configured in schema, so deleting the module removes fields and records
  return prisma.customModule.deleteMany({
    where: { id, tenantId },
  });
}

// ----------------------------------------------------------------------------
// MODULE FIELDS
// ----------------------------------------------------------------------------

export async function getCustomModuleFields(moduleId: string) {
  return prisma.customModuleField.findMany({
    where: { moduleId },
    orderBy: { sequence: 'asc' },
  });
}

export async function createCustomModuleField(moduleId: string, data: CreateFieldInput) {
  const lastField = await prisma.customModuleField.findFirst({
    where: { moduleId },
    orderBy: { sequence: 'desc' },
  });

  return prisma.customModuleField.create({
    data: {
      moduleId,
      name: data.name,
      label: data.label,
      type: data.type,
      required: data.required ?? false,
      defaultValue: data.defaultValue,
      options: data.options,
      validation: data.validation,
      sequence: data.sequence ?? (lastField?.sequence ?? 0) + 1,
      isSystem: data.isSystem ?? false,
      settings: data.settings,
    },
  });
}

export async function updateCustomModuleField(id: string, data: UpdateFieldInput) {
  // Add safety check so system fields cannot have critical props changed
  const field = await prisma.customModuleField.findUnique({ where: { id } });
  if (field?.isSystem) {
    // Only allow changing label, settings, sequence
    return prisma.customModuleField.update({
      where: { id },
      data: {
        label: data.label,
        sequence: data.sequence,
        settings: data.settings,
      },
    });
  }

  return prisma.customModuleField.update({
    where: { id },
    data: {
      name: data.name,
      label: data.label,
      type: data.type,
      required: data.required,
      defaultValue: data.defaultValue,
      options: data.options,
      validation: data.validation,
      sequence: data.sequence,
      settings: data.settings,
    },
  });
}

export async function deleteCustomModuleField(id: string) {
  // Do not delete system fields
  const field = await prisma.customModuleField.findUnique({ where: { id } });
  if (field?.isSystem) throw new Error('Cannot delete system fields');

  return prisma.customModuleField.delete({ where: { id } });
}

export async function reorderFields(moduleId: string, fieldIds: string[]) {
  // Update sequences in memory then run updates in transaction
  const updates = fieldIds.map((id, index) =>
    prisma.customModuleField.update({
      where: { id },
      data: { sequence: index },
    })
  );
  return prisma.$transaction(updates);
}

// ----------------------------------------------------------------------------
// CUSTOM RECORDS
// ----------------------------------------------------------------------------

export async function getCustomRecords(
  moduleId: string,
  tenantId: string,
  filters?: RecordFilters
): Promise<PaginatedResponse<CustomRecord>> {
  const { skip = 0, take = 50, search, sortBy = 'createdAt', sortOrder = 'desc' } = filters || {};

  const allowedRecordSortFields = ['createdAt', 'updatedAt'];
  const safeSortBy = allowedRecordSortFields.includes(sortBy as string) ? sortBy : 'createdAt';

  // Note: we fetch all and filter in memory if searching in JSON data
  // For production with massive datasets, consider PostgreSQL JSONB features
  const where: Prisma.CustomRecordWhereInput = {
    moduleId,
    tenantId,
  };

  const records = await prisma.customRecord.findMany({
    where,
    skip,
    take,
    orderBy: { [safeSortBy]: sortOrder },
  });

  const count = await prisma.customRecord.count({ where });

  // Perform basic in-memory text search over JSON if applicable
  let filteredRecords = records;
  if (search) {
    const s = search.toLowerCase();
    filteredRecords = records.filter(r => {
      if (!r.data || typeof r.data !== 'object') return false;
      return Object.values(r.data).some(val =>
        val && typeof val === 'string' && val.toLowerCase().includes(s)
      );
    });
  }

  // Need to cast the data cleanly for Typescript
  const typedRecords = filteredRecords.map(r => ({
    ...r,
    data: r.data as Record<string, any>,
  })) as CustomRecord[];

  return { data: typedRecords, count, skip, take };
}

export async function getCustomRecordById(id: string, tenantId: string) {
  const r = await prisma.customRecord.findFirst({
    where: { id, tenantId },
  });
  if (!r) return null;
  return { ...r, data: r.data as Record<string, any> } as CustomRecord;
}

export async function createCustomRecord(
  moduleId: string,
  tenantId: string,
  data: Record<string, any>,
  createdById?: string
) {
  // Note: actual field validation logic should happen at the service/controller layer
  // before calling this data access method. See `validation.ts`.
  return prisma.customRecord.create({
    data: {
      moduleId,
      tenantId,
      data,
      createdById,
    },
  });
}

export async function updateCustomRecord(
  id: string,
  tenantId: string,
  dataToUpdate: Record<string, any>
) {
  // Get existing to merge data
  const existing = await prisma.customRecord.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error('Record not found');

  const mergedData = { ...(existing.data as object), ...dataToUpdate };

  return prisma.customRecord.update({
    where: { id },
    data: { data: mergedData },
  });
}

export async function deleteCustomRecord(id: string, tenantId: string) {
  return prisma.customRecord.deleteMany({
    where: { id, tenantId },
  });
}

export async function bulkDeleteRecords(ids: string[], tenantId: string, moduleId?: string) {
  return prisma.customRecord.deleteMany({
    where: {
      id: { in: ids },
      tenantId,
      ...(moduleId && { moduleId }),
    },
  });
}
