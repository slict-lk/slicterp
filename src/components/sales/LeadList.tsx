'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Mail, Phone, TrendingUp, DollarSign } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status: 'NEW' | 'QUALIFIED' | 'PROPOSITION' | 'WON' | 'LOST';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  expectedRevenue?: number;
  probability?: number;
  createdAt: Date;
}

interface LeadListProps {
  leads: Lead[];
  onCreateNew: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onView: (lead: Lead) => void;
}

const STATUS_COLORS = {
  NEW: 'bg-blue-100 text-blue-800',
  QUALIFIED: 'bg-green-100 text-green-800',
  PROPOSITION: 'bg-yellow-100 text-yellow-800',
  WON: 'bg-emerald-100 text-emerald-800',
  LOST: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export function LeadList({ leads, onCreateNew, onEdit, onDelete, onView }: LeadListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);

    const matchesStatus = filterStatus === 'ALL' || lead.status === filterStatus;
    const matchesPriority = filterPriority === 'ALL' || lead.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const leadsByStatus = {
    NEW: filteredLeads.filter((l) => l.status === 'NEW'),
    QUALIFIED: filteredLeads.filter((l) => l.status === 'QUALIFIED'),
    PROPOSITION: filteredLeads.filter((l) => l.status === 'PROPOSITION'),
    WON: filteredLeads.filter((l) => l.status === 'WON'),
    LOST: filteredLeads.filter((l) => l.status === 'LOST'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-gray-600">{filteredLeads.length} leads</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="ALL">All Status</option>
                <option value="NEW">New</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="PROPOSITION">Proposition</option>
                <option value="WON">Won</option>
                <option value="LOST">Lost</option>
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="ALL">All Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(leadsByStatus).map(([status, statusLeads]) => (
          <div key={status} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </h3>
              <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                {statusLeads.length}
              </span>
            </div>
            <div className="space-y-3">
              {statusLeads.map((lead) => (
                <Card
                  key={lead.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onView(lead)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{lead.name}</h4>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            PRIORITY_COLORS[lead.priority]
                          }`}
                        >
                          {lead.priority}
                        </span>
                      </div>

                      {lead.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}

                      {lead.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{lead.phone}</span>
                        </div>
                      )}

                      {lead.expectedRevenue && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <DollarSign className="h-3 w-3" />
                          <span>${lead.expectedRevenue.toLocaleString()}</span>
                          {lead.probability && (
                            <span className="text-gray-400">({lead.probability}%)</span>
                          )}
                        </div>
                      )}

                      {lead.source && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <TrendingUp className="h-3 w-3" />
                          <span>{lead.source}</span>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(lead);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this lead?')) onDelete(lead.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {statusLeads.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No leads</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
