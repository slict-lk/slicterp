import { z } from 'zod';
import { CustomModuleField } from './types';

/**
 * Builds a dynamic Zod schema based on the custom module field definitions.
 * This can be used to validate incoming API requests and form submissions.
 */
export function buildDynamicSchema(fields: CustomModuleField[]) {
    const schemaShape: Record<string, z.ZodTypeAny> = {};

    for (const field of fields) {
        let fieldSchema: z.ZodTypeAny;

        switch (field.type) {
            case 'text':
            case 'textarea':
            case 'richtext':
                fieldSchema = z.string();
                if (field.validation?.min) fieldSchema = (fieldSchema as z.ZodString).min(field.validation.min);
                if (field.validation?.max) fieldSchema = (fieldSchema as z.ZodString).max(field.validation.max);
                if (field.validation?.pattern) {
                    try {
                        fieldSchema = (fieldSchema as z.ZodString).regex(new RegExp(field.validation.pattern));
                    } catch {
                        // Invalid regex pattern in field config - skip regex validation
                    }
                }
                break;

            case 'number':
            case 'currency':
                // Values from forms often come as strings, so coerce them to numbers
                fieldSchema = z.coerce.number();
                if (field.validation?.min !== undefined) fieldSchema = (fieldSchema as z.ZodNumber).min(field.validation.min);
                if (field.validation?.max !== undefined) fieldSchema = (fieldSchema as z.ZodNumber).max(field.validation.max);
                break;

            case 'date':
                // Coerce string dates into proper Date objects, or string ISO dates
                fieldSchema = z.coerce.date().transform(d => d.toISOString());
                break;

            case 'boolean':
                // Checkboxes might send 'on', 'true', true, false etc.
                fieldSchema = z.union([z.boolean(), z.string()]).transform(val => {
                    if (typeof val === 'string') return val === 'true' || val === 'on' || val === '1';
                    return val;
                });
                break;

            case 'email':
                fieldSchema = z.string().email();
                break;

            case 'phone':
                fieldSchema = z.string().min(5).max(20);
                break;

            case 'url':
                fieldSchema = z.string().url();
                break;

            case 'select':
                if (field.options && field.options.length > 0) {
                    fieldSchema = z.enum(field.options as [string, ...string[]]);
                } else {
                    fieldSchema = z.string();
                }
                break;

            case 'multiselect':
                // Accept both array and comma/newline-separated string from textarea
                const multiselectPreprocess = z.preprocess((val) => {
                    if (Array.isArray(val)) return val;
                    if (typeof val === 'string') {
                        return val.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
                    }
                    return val;
                }, field.options && field.options.length > 0
                    ? z.array(z.enum(field.options as [string, ...string[]]))
                    : z.array(z.string())
                );
                fieldSchema = multiselectPreprocess;
                if (field.settings?.maxSelections) {
                    // maxSelections can't be applied after preprocess; skip for now
                }
                break;

            case 'json':
                // Basic JSON validation (checks if object/array)
                fieldSchema = z.any().refine(val => {
                    if (typeof val === 'object' && val !== null) return true;
                    try {
                        if (typeof val === 'string') JSON.parse(val);
                        return typeof val === 'string';
                    } catch {
                        return false;
                    }
                }, { message: 'Invalid JSON' }).transform((v) => {
                    if (typeof v === 'string') return JSON.parse(v);
                    return v;
                });
                break;

            case 'lookup':
                // Usually stores the ID of the related record
                fieldSchema = z.string().cuid();
                break;

            case 'file':
            case 'image':
                // Stores Cloudinary URL
                fieldSchema = z.string().url();
                break;

            default:
                fieldSchema = z.any();
        }

        if (field.required) {
            // If it's a string, ensure it's not empty
            if (fieldSchema._def?.typeName === 'ZodString') {
                fieldSchema = (fieldSchema as z.ZodString).min(1, { message: `${field.label} is required` });
            } else if (fieldSchema._def?.typeName === 'ZodArray') {
                fieldSchema = (fieldSchema as z.ZodArray<any>).min(1, { message: `${field.label} is required` });
            }
        } else {
            // If optional, allow undefined or null (and empty string for text fields)
            if (fieldSchema._def?.typeName === 'ZodString') {
                fieldSchema = z.union([fieldSchema, z.literal('')]).optional().nullable().transform(val => val === '' ? null : val);
            } else {
                fieldSchema = fieldSchema.optional().nullable();
            }
        }

        schemaShape[field.name] = fieldSchema;
    }

    return z.object(schemaShape);
}

/**
 * Validates record data against the module's fields definitions.
 * Throws ZodError if validation fails.
 */
export function validateRecordData(fields: CustomModuleField[], data: Record<string, any>) {
    const schema = buildDynamicSchema(fields);
    return schema.parse(data);
}

/**
 * Validates record data, returning SafeParseReturnType.
 * Non-throwing version.
 */
export function safeValidateRecordData(fields: CustomModuleField[], data: Record<string, any>) {
    const schema = buildDynamicSchema(fields);
    return schema.safeParse(data);
}
