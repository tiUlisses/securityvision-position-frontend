import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

import ConfirmModal from "../components/common/ConfirmModal";

import CreateUserModal from "../components/admin/modals/CreateUserModal";
import EditUserModal from "../components/admin/modals/EditUserModal";
import CreateGroupModal from "../components/admin/modals/CreateGroupModal";
import EditGroupModal from "../components/admin/modals/EditGroupModal";

import { listUsers, deleteUser } from "../api/users";
import type { UserEntity } from "../api/users";

import { listSupportGroups, deleteSupportGroup } from "../api/supportGroups";
import type { SupportGroupEntity } from "../api/supportGroups";

type TabKey = "users" | "groups";

const isAdminRole = (role?: string) => role === "ADMIN" || role === "SUPERADMIN";

const pill = (active: boolean) =>
  active
    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
    : "bg-slate-500/10 border-slate-500/30 text-slate-200";

const AdminUsersGroupsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = Boolean((user as any)?.is_superuser) || isAdminRole((user as any)?.role);

  const [tab, setTab] = useState<TabKey>("users");

  const [users, setUsers] = useState<UserEntity[]>([]);
  const [groups, setGroups] = useState<SupportGroupEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  // Modais
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserEntity | null>(null);

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SupportGroupEntity | null>(null);

  // Confirm delete
  const [confirmDeleteUserOpen, setConfirmDeleteUserOpen] = useState(false);
  const [confirmDeleteGroupOpen, setConfirmDeleteGroupOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserEntity | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<SupportGroupEntity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, g] = await Promise.all([listUsers(), listSupportGroups()]);
      setUsers(u);
      setGroups(g);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar usuários e grupos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const groupsByUser = useMemo(() => {
    const map = new Map<number, SupportGroupEntity[]>();
    for (const g of groups) {
      for (const m of g.members ?? []) {
        const arr = map.get(m.id) ?? [];
        arr.push(g);
        map.set(m.id, arr);
      }
    }
    return map;
  }, [groups]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.full_name, u.email, u.role]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [users, userSearch]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      [g.name, g.description ?? "", g.chatwoot_inbox_identifier ?? ""]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [groups, groupSearch]);

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-200">
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="mt-2 text-sm text-slate-400">
          Esta área é destinada a usuários administradores.
        </p>
      </div>
    );
  }

  const openDeleteUser = (u: UserEntity) => {
    setDeletingUser(u);
    setConfirmDeleteUserOpen(true);
  };

  const openDeleteGroup = (g: SupportGroupEntity) => {
    setDeletingGroup(g);
    setConfirmDeleteGroupOpen(true);
  };

  const canDeleteUser = (u: UserEntity) => {
    // não deixa deletar o próprio usuário logado
    if ((user as any)?.id === u.id) return false;
    return true;
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteUser(deletingUser.id);
      setConfirmDeleteUserOpen(false);
      setDeletingUser(null);
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? "Falha ao deletar usuário.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteSupportGroup(deletingGroup.id);
      setConfirmDeleteGroupOpen(false);
      setDeletingGroup(null);
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? "Falha ao deletar grupo.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">
            Administração • Usuários & Grupos
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Crie operadores, associe grupos e vincule cada grupo a uma inbox do Chatwoot.
          </p>
        </div>

        <button
          onClick={loadAll}
          disabled={loading}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-rose-500/10 border border-rose-500/40 px-3 py-2 text-xs text-rose-100">
          {error}
        </div>
      )}

      <div className="flex rounded-full bg-slate-800 p-1 text-xs w-fit">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`rounded-full px-4 py-1.5 transition ${
            tab === "users"
              ? "bg-slate-50 text-slate-900 font-semibold"
              : "text-slate-300 hover:text-white"
          }`}
        >
          Usuários
        </button>
        <button
          type="button"
          onClick={() => setTab("groups")}
          className={`rounded-full px-4 py-1.5 transition ${
            tab === "groups"
              ? "bg-slate-50 text-slate-900 font-semibold"
              : "text-slate-300 hover:text-white"
          }`}
        >
          Grupos
        </button>
      </div>

      {tab === "users" ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-50">Usuários</div>
              <div className="text-xs text-slate-400">
                Admins criam usuários e gerenciam associação a grupos.
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full md:w-72 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Buscar por nome, e-mail ou role..."
              />
              <button
                onClick={() => setCreateUserOpen(true)}
                className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600"
              >
                + Novo usuário
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-slate-300">
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">E-mail</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Grupos</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((u) => {
                  const userGroups = groupsByUser.get(u.id) ?? [];
                  const allowDelete = canDeleteUser(u);

                  return (
                    <tr
                      key={u.id}
                      className="border-t border-slate-800 text-slate-100 hover:bg-slate-900/80"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.full_name}</div>
                        <div className="mt-0.5 text-[10px] text-slate-500">ID #{u.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-200">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px]">
                          {u.is_superuser ? "SUPERUSER" : String(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] ${pill(u.is_active)}`}>
                          {u.is_active ? "ATIVO" : "INATIVO"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {userGroups.length === 0 ? (
                            <span className="text-[10px] text-slate-500">—</span>
                          ) : (
                            userGroups.slice(0, 3).map((g) => (
                              <span
                                key={g.id}
                                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                              >
                                {g.name}
                              </span>
                            ))
                          )}
                          {userGroups.length > 3 && (
                            <span className="text-[10px] text-slate-500">+{userGroups.length - 3}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setEditUserOpen(true);
                            }}
                            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-100 hover:bg-slate-800"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => openDeleteUser(u)}
                            disabled={!allowDelete}
                            title={!allowDelete ? "Você não pode deletar seu próprio usuário" : "Deletar usuário"}
                            className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-100 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-50">Grupos</div>
              <div className="text-xs text-slate-400">
                Crie grupos do Security Vision e vincule-os às inboxes do Chatwoot.
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className="w-full md:w-72 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Buscar por nome, descrição ou inbox..."
              />
              <button
                onClick={() => setCreateGroupOpen(true)}
                className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600"
              >
                + Novo grupo
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-slate-300">
                  <th className="px-4 py-3 text-left font-medium">Grupo</th>
                  <th className="px-4 py-3 text-left font-medium">Chatwoot</th>
                  <th className="px-4 py-3 text-left font-medium">SLA</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Membros</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredGroups.map((g) => (
                  <tr
                    key={g.id}
                    className="border-t border-slate-800 text-slate-100 hover:bg-slate-900/80"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{g.name}</div>
                      <div className="mt-0.5 text-[10px] text-slate-500">ID #{g.id}</div>
                      {g.description && (
                        <div className="mt-1 text-[11px] text-slate-400">{g.description}</div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-[11px] text-slate-200">
                        Inbox: {g.chatwoot_inbox_identifier ?? "—"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Team ID: {g.chatwoot_team_id ?? "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-200">
                      {g.default_sla_minutes ?? "—"}
                      {g.default_sla_minutes ? " min" : ""}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] ${pill(g.is_active)}`}>
                        {g.is_active ? "ATIVO" : "INATIVO"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(g.members ?? []).length === 0 ? (
                          <span className="text-[10px] text-slate-500">—</span>
                        ) : (
                          (g.members ?? []).slice(0, 3).map((m) => (
                            <span
                              key={m.id}
                              className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                              title={m.email}
                            >
                              {m.full_name}
                            </span>
                          ))
                        )}
                        {(g.members ?? []).length > 3 && (
                          <span className="text-[10px] text-slate-500">+{(g.members ?? []).length - 3}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => {
                            setEditingGroup(g);
                            setEditGroupOpen(true);
                          }}
                          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-100 hover:bg-slate-800"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => openDeleteGroup(g)}
                          className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-100 hover:bg-rose-500/20"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-500">
                      Nenhum grupo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAIS */}
      <CreateUserModal
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        groups={groups}
        onSaved={async () => {
          setCreateUserOpen(false);
          await loadAll();
        }}
      />

      <EditUserModal
        isOpen={editUserOpen}
        onClose={() => {
          setEditUserOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        groups={groups}
        onSaved={async () => {
          setEditUserOpen(false);
          setEditingUser(null);
          await loadAll();
        }}
      />

      <CreateGroupModal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        users={users}
        onSaved={async () => {
          setCreateGroupOpen(false);
          await loadAll();
        }}
      />

      <EditGroupModal
        isOpen={editGroupOpen}
        onClose={() => {
          setEditGroupOpen(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
        users={users}
        onSaved={async () => {
          setEditGroupOpen(false);
          setEditingGroup(null);
          await loadAll();
        }}
      />

      {/* CONFIRMAÇÕES */}
      <ConfirmModal
        isOpen={confirmDeleteUserOpen}
        title="Deletar usuário"
        description={
          deletingUser
            ? `Tem certeza que deseja deletar o usuário "${deletingUser.full_name}"? Essa ação não pode ser desfeita.`
            : ""
        }
        confirmText="Deletar"
        danger
        isLoading={deleting}
        onClose={() => {
          setConfirmDeleteUserOpen(false);
          setDeletingUser(null);
        }}
        onConfirm={handleDeleteUser}
      />

      <ConfirmModal
        isOpen={confirmDeleteGroupOpen}
        title="Deletar grupo"
        description={
          deletingGroup
            ? `Tem certeza que deseja deletar o grupo "${deletingGroup.name}"? Essa ação não pode ser desfeita.`
            : ""
        }
        confirmText="Deletar"
        danger
        isLoading={deleting}
        onClose={() => {
          setConfirmDeleteGroupOpen(false);
          setDeletingGroup(null);
        }}
        onConfirm={handleDeleteGroup}
      />
    </div>
  );
};

export default AdminUsersGroupsPage;
