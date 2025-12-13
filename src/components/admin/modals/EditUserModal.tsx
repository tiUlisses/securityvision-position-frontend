import React, { FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "../../common/Modal";

import { updateUser } from "../../../api/users";
import type { UpdateUserInput, UserEntity, UserRole } from "../../../api/users";

import { updateSupportGroup } from "../../../api/supportGroups";
import type { SupportGroupEntity } from "../../../api/supportGroups";

const uniq = (ids: number[]) => Array.from(new Set(ids)).sort((a, b) => a - b);

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: UserEntity | null;
  groups: SupportGroupEntity[];
  onSaved: () => Promise<void> | void;
};

const EditUserModal: React.FC<Props> = ({ isOpen, onClose, user, groups, onSaved }) => {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("OPERATOR");
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [chatwootAgentId, setChatwootAgentId] = useState<string>("");

  const initialGroupIds = useMemo(() => {
    if (!user) return [];
    return uniq(
      groups
        .filter((g) => (g.members ?? []).some((m) => m.id === user.id))
        .map((g) => g.id)
    );
  }, [user, groups]);

  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    setFullName(user.full_name ?? "");
    setRole((user.role ?? "OPERATOR") as UserRole);
    setIsSuperuser(Boolean(user.is_superuser));
    setIsActive(Boolean(user.is_active));
    setChatwootAgentId(
      user.chatwoot_agent_id !== null && user.chatwoot_agent_id !== undefined
        ? String(user.chatwoot_agent_id)
        : ""
    );

    setSelectedGroupIds(initialGroupIds);
    setSaving(false);
    setError(null);
  }, [isOpen, user, initialGroupIds]);

  const toggleGroup = (id: number) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    if (!fullName.trim()) {
      setError("Nome é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const patch: UpdateUserInput = {
        full_name: fullName.trim(),
        role,
        is_active: isActive,
        is_superuser: isSuperuser,
        chatwoot_agent_id: chatwootAgentId.trim() ? Number(chatwootAgentId) : null,
      };

      await updateUser(user.id, patch);

      const desired = uniq(selectedGroupIds);

      // Atualiza membership (fonte: grupo)
      for (const g of groups) {
        const current = uniq((g.members ?? []).map((m) => m.id));
        const hasUser = current.includes(user.id);
        const shouldHaveUser = desired.includes(g.id);

        if (shouldHaveUser && !hasUser) {
          await updateSupportGroup(g.id, { member_ids: uniq([...current, user.id]) });
        } else if (!shouldHaveUser && hasUser) {
          await updateSupportGroup(g.id, { member_ids: current.filter((id) => id !== user.id) });
        }
      }

      await onSaved();
    } catch (err: any) {
      setError(err?.message ?? "Falha ao atualizar usuário.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={user ? `Editar usuário • ${user.full_name}` : "Editar usuário"}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
      {!user ? (
        <div className="text-xs text-slate-400">Nenhum usuário selecionado.</div>
      ) : (
        <>
          {error && (
            <div className="mb-3 rounded-md bg-rose-500/10 border border-rose-500/40 px-3 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome completo
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  E-mail (somente leitura)
                </label>
                <input
                  value={user.email}
                  readOnly
                  className="w-full rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPERADMIN">SUPERADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Chatwoot Agent ID (opcional)
                </label>
                <input
                  value={chatwootAgentId}
                  onChange={(e) => setChatwootAgentId(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="ex.: 12"
                  inputMode="numeric"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Ativo
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={isSuperuser}
                    onChange={(e) => setIsSuperuser(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Superuser
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs font-semibold text-slate-100">Grupos</div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {groups.map((g) => (
                  <label
                    key={g.id}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{g.name}</span>
                    <span className="text-[10px] text-slate-500">
                      inbox: {g.chatwoot_inbox_identifier ?? "—"}
                    </span>
                  </label>
                ))}
                {groups.length === 0 && (
                  <div className="text-xs text-slate-500">Nenhum grupo cadastrado ainda.</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
};

export default EditUserModal;
