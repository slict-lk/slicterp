/**
 * Module Permissions Manager Component
 * Admin interface for managing user module permissions
 */

'use client';

import React, { useState } from 'react';
import { getAllModules, MODULE_CATEGORIES } from '@/lib/modules';

interface ModulePermissionManagerProps {
  userId?: string; // Optional for future use
  currentPermissions: Record<string, unknown>;
  onSave: (permissions: Record<string, unknown>) => Promise<void>;
  readonly?: boolean;
}

export default function ModulePermissionManager({
  currentPermissions,
  onSave,
  readonly = false,
}: ModulePermissionManagerProps) {
  const [permissions, setPermissions] = useState(currentPermissions || {});
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const modules = getAllModules();
  const categories = MODULE_CATEGORIES;

  const handlePermissionChange = (
    moduleId: string,
    field: string,
    value: boolean
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(permissions);
    } catch (error) {
      console.error('Failed to save permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  const enableAllInCategory = (categoryId: string) => {
    const categoryModules = modules.filter((m) => m.category === categoryId);
    const updated = { ...permissions };

    categoryModules.forEach((module) => {
      updated[module.id] = {
        enabled: true,
        view: true,
        create: module.permissions.create,
        edit: module.permissions.edit,
        delete: module.permissions.delete,
        export: module.permissions.export || false,
        import: module.permissions.import || false,
        approve: module.permissions.approve || false,
      };
    });

    setPermissions(updated);
  };

  const disableAllInCategory = (categoryId: string) => {
    const categoryModules = modules.filter((m) => m.category === categoryId);
    const updated = { ...permissions };

    categoryModules.forEach((module) => {
      updated[module.id] = {
        ...(updated[module.id] || {}),
        enabled: false,
      };
    });

    setPermissions(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Module Permissions</h3>
        {!readonly && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 rounded-lg text-sm ${
            selectedCategory === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Modules
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-1 rounded-lg text-sm ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {categories
          .filter((cat) => !selectedCategory || cat.id === selectedCategory)
          .map((category) => {
            const categoryModules = modules.filter(
              (m) => m.category === category.id
            );

            if (categoryModules.length === 0) return null;

            return (
              <div key={category.id} className="border rounded-lg p-4">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">
                    {category.name}
                  </h4>
                  {!readonly && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => enableAllInCategory(category.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Enable All
                      </button>
                      <button
                        onClick={() => disableAllInCategory(category.id)}
                        className="text-xs text-gray-600 hover:underline"
                      >
                        Disable All
                      </button>
                    </div>
                  )}
                </div>

                {/* Modules in Category */}
                <div className="space-y-3">
                  {categoryModules.map((module) => {
                    const modulePermission = (permissions[module.id] as any) || {};

                    return (
                      <div
                        key={module.id}
                        className="flex items-start gap-4 p-3 bg-gray-50 rounded"
                      >
                        {/* Module Info */}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {module.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {module.description}
                          </div>
                        </div>

                        {/* Permission Checkboxes */}
                        <div className="flex gap-3 items-center text-xs">
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={modulePermission.enabled || false}
                              onChange={(e) =>
                                handlePermissionChange(
                                  module.id,
                                  'enabled',
                                  e.target.checked
                                )
                              }
                              disabled={readonly}
                              className="rounded"
                            />
                            <span>Enabled</span>
                          </label>

                          {modulePermission.enabled && (
                            <>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={modulePermission.view || false}
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      module.id,
                                      'view',
                                      e.target.checked
                                    )
                                  }
                                  disabled={readonly}
                                  className="rounded"
                                />
                                <span>View</span>
                              </label>

                              {module.permissions.create && (
                                <label className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={modulePermission.create || false}
                                    onChange={(e) =>
                                      handlePermissionChange(
                                        module.id,
                                        'create',
                                        e.target.checked
                                      )
                                    }
                                    disabled={readonly}
                                    className="rounded"
                                  />
                                  <span>Create</span>
                                </label>
                              )}

                              {module.permissions.edit && (
                                <label className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={modulePermission.edit || false}
                                    onChange={(e) =>
                                      handlePermissionChange(
                                        module.id,
                                        'edit',
                                        e.target.checked
                                      )
                                    }
                                    disabled={readonly}
                                    className="rounded"
                                  />
                                  <span>Edit</span>
                                </label>
                              )}

                              {module.permissions.delete && (
                                <label className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={modulePermission.delete || false}
                                    onChange={(e) =>
                                      handlePermissionChange(
                                        module.id,
                                        'delete',
                                        e.target.checked
                                      )
                                    }
                                    disabled={readonly}
                                    className="rounded"
                                  />
                                  <span>Delete</span>
                                </label>
                              )}

                              {module.permissions.export && (
                                <label className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={modulePermission.export || false}
                                    onChange={(e) =>
                                      handlePermissionChange(
                                        module.id,
                                        'export',
                                        e.target.checked
                                      )
                                    }
                                    disabled={readonly}
                                    className="rounded"
                                  />
                                  <span>Export</span>
                                </label>
                              )}

                              {module.permissions.approve && (
                                <label className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={modulePermission.approve || false}
                                    onChange={(e) =>
                                      handlePermissionChange(
                                        module.id,
                                        'approve',
                                        e.target.checked
                                      )
                                    }
                                    disabled={readonly}
                                    className="rounded"
                                  />
                                  <span>Approve</span>
                                </label>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

