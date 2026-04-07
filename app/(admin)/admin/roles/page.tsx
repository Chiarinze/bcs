"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import Button from "@/components/ui/Button";
import {
  Shield,
  Briefcase,
  UserPlus,
  UserMinus,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { MemberRole, RoleCategory } from "@/types";

interface MemberOption {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  choir_part: string | null;
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<MemberRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Assign modal state
  const [assigningRole, setAssigningRole] = useState<MemberRole | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  // Create role modal state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<RoleCategory>("management");
  const [newChoirPart, setNewChoirPart] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    const res = await fetch("/api/roles");
    if (res.ok) {
      setRoles(await res.json());
    }
    setLoading(false);
  }

  async function openAssignModal(role: MemberRole) {
    setAssigningRole(role);
    setSelectedMemberId("");
    setMemberSearch("");
    setMembersLoading(true);

    const params = role.choir_part_required
      ? `?choir_part=${encodeURIComponent(role.choir_part_required)}`
      : "";

    const res = await fetch(`/api/members/verified${params}`);
    if (res.ok) {
      setMembers(await res.json());
    }
    setMembersLoading(false);
  }

  async function handleAssign() {
    if (!assigningRole || !selectedMemberId) return;

    setActionLoading(assigningRole.id);

    const res = await fetch("/api/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: assigningRole.id, member_id: selectedMemberId }),
    });

    if (res.ok) {
      setAssigningRole(null);
      fetchRoles();
    } else {
      const data = await res.json();
      alert(data.error || "Assignment failed");
    }

    setActionLoading(null);
  }

  async function handleUnassign(roleId: string) {
    if (!confirm("Remove this member from this role?")) return;

    setActionLoading(roleId);

    const res = await fetch("/api/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: roleId, member_id: null }),
    });

    if (res.ok) {
      fetchRoles();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to unassign");
    }

    setActionLoading(null);
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);

    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        category: newCategory,
        choir_part_required: newChoirPart || null,
      }),
    });

    if (res.ok) {
      setShowCreateForm(false);
      setNewTitle("");
      setNewCategory("management");
      setNewChoirPart("");
      fetchRoles();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create role");
    }

    setCreating(false);
  }

  async function handleDeleteRole(roleId: string) {
    if (!confirm("Are you sure you want to delete this role?")) return;

    setActionLoading(roleId);

    const res = await fetch(`/api/roles?id=${roleId}`, { method: "DELETE" });
    if (res.ok) {
      fetchRoles();
    } else {
      const data = await res.json();
      alert(data.error || "Delete failed");
    }

    setActionLoading(null);
  }

  const executiveRoles = roles.filter((r) => r.category === "executive");
  const managementRoles = roles.filter((r) => r.category === "management");

  const filteredMembers = members.filter((m) => {
    if (!memberSearch) return true;
    const name = `${m.first_name} ${m.last_name}`.toLowerCase();
    return name.includes(memberSearch.toLowerCase());
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 border-3 border-bcs-green border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Roles & Positions</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Assign members to executive and management positions
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-bcs-green text-white text-sm font-medium hover:bg-bcs-green/90 transition"
          >
            <Plus className="w-4 h-4" /> New Role
          </button>
        </div>

        {/* Create Role Form */}
        {showCreateForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Create New Role</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Role Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Assistant Registrar"
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as RoleCategory)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                  >
                    <option value="executive">Executive (Board of Directors)</option>
                    <option value="management">Management</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Choir Part Required <span className="text-gray-400">(optional)</span>
                  </label>
                  <select
                    value={newChoirPart}
                    onChange={(e) => setNewChoirPart(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                  >
                    <option value="">No restriction</option>
                    <option value="Soprano">Soprano</option>
                    <option value="Alto">Alto</option>
                    <option value="Tenor">Tenor</option>
                    <option value="Bass">Bass</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" loading={creating}>
                  Create Role
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Executive Roles */}
        <RoleSection
          title="Executive (Board of Directors)"
          icon={<Shield className="w-5 h-5 text-bcs-green" />}
          roles={executiveRoles}
          actionLoading={actionLoading}
          onAssign={openAssignModal}
          onUnassign={handleUnassign}
          onDelete={handleDeleteRole}
        />

        {/* Management Roles */}
        <RoleSection
          title="Management"
          icon={<Briefcase className="w-5 h-5 text-bcs-green" />}
          roles={managementRoles}
          actionLoading={actionLoading}
          onAssign={openAssignModal}
          onUnassign={handleUnassign}
          onDelete={handleDeleteRole}
        />

        {/* Assign Modal */}
        {assigningRole && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setAssigningRole(null)}
            />
            <div className="fixed inset-x-4 top-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white rounded-2xl shadow-xl z-50 w-full sm:max-w-md max-h-[80vh] flex flex-col">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Assign Member</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{assigningRole.title}</p>
                    {assigningRole.choir_part_required && (
                      <p className="text-xs text-amber-600 mt-1">
                        Restricted to {assigningRole.choir_part_required} members only
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setAssigningRole(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-full mt-3 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {membersLoading ? (
                  <div className="flex justify-center py-8">
                    <span className="h-6 w-6 border-2 border-bcs-green border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">
                    No eligible members found.
                  </p>
                ) : (
                  filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMemberId(m.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                        selectedMemberId === m.id
                          ? "bg-bcs-green/10 ring-1 ring-bcs-green"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {m.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.photo_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-bcs-green/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-bcs-green" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {m.first_name} {m.last_name}
                        </p>
                        {m.choir_part && (
                          <p className="text-xs text-gray-400">{m.choir_part}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-gray-100 flex gap-2">
                <Button
                  variant="primary"
                  loading={actionLoading === assigningRole.id}
                  onClick={handleAssign}
                  disabled={!selectedMemberId}
                  className="flex-1"
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Assign
                </Button>
                <Button variant="outline" onClick={() => setAssigningRole(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

/* ─── Role Section ─── */
function RoleSection({
  title,
  icon,
  roles,
  actionLoading,
  onAssign,
  onUnassign,
  onDelete,
}: {
  title: string;
  icon: React.ReactNode;
  roles: MemberRole[];
  actionLoading: string | null;
  onAssign: (role: MemberRole) => void;
  onUnassign: (roleId: string) => void;
  onDelete: (roleId: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {roles.length} roles
        </span>
      </div>

      {roles.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-400">No roles in this category.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                    Position
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                    Assigned To
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                    Restriction
                  </th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{role.title}</td>
                    <td className="px-5 py-4">
                      {role.assignee ? (
                        <div className="flex items-center gap-2">
                          {role.assignee.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={role.assignee.photo_url}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-bcs-green/10 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-bcs-green" />
                            </div>
                          )}
                          <span className="text-gray-800">
                            {role.assignee.first_name} {role.assignee.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic">Vacant</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {role.choir_part_required ? (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          {role.choir_part_required} only
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {role.assignee ? (
                          <button
                            onClick={() => onUnassign(role.id)}
                            disabled={actionLoading === role.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition"
                          >
                            <UserMinus className="w-3.5 h-3.5" /> Remove
                          </button>
                        ) : (
                          <button
                            onClick={() => onAssign(role)}
                            disabled={actionLoading === role.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bcs-green/10 text-bcs-green text-xs font-medium hover:bg-bcs-green/20 disabled:opacity-50 transition"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Assign
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(role.id)}
                          disabled={actionLoading === role.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition"
                          title="Delete role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {roles.map((role) => (
              <div key={role.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{role.title}</p>
                    {role.choir_part_required && (
                      <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {role.choir_part_required} only
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(role.id)}
                    className="p-1 text-gray-300 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {role.assignee ? (
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      {role.assignee.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={role.assignee.photo_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-bcs-green/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-bcs-green" />
                        </div>
                      )}
                      <span className="text-sm text-gray-800">
                        {role.assignee.first_name} {role.assignee.last_name}
                      </span>
                    </div>
                    <button
                      onClick={() => onUnassign(role.id)}
                      disabled={actionLoading === role.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition"
                    >
                      <UserMinus className="w-3 h-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAssign(role)}
                    disabled={actionLoading === role.id}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-bcs-green/10 text-bcs-green text-sm font-medium hover:bg-bcs-green/20 disabled:opacity-50 transition"
                  >
                    <UserPlus className="w-4 h-4" /> Assign Member
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
