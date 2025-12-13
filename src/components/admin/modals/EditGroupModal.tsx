import React, { FormEvent, useEffect, useState } from "react";
import Modal from "../../common/Modal";

import { updateSupportGroup } from "../../../api/supportGroups";
import type { SupportGroupEntity, UpdateSupportGroupInput } from "../../../api/supportGroups";
import type { UserEntity } from "../../../api/users";

const uniq = (ids: number[]) => Array.from(new Set(ids)).sort((a, b) => a - b);

type Props = {
  isOpen: boolean;
  onClose: () => void;
  group: SupportGroupEntity | null;
  users: UserEntity[];
  onSaved: () => Promise<void> | void;
};

const EditGroupModal: React.FC<Props> = ({ isOpen, onClose, group, users, onSaved }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [slaMinutes, setSlaMinutes] = useState<string>("");
  const [inboxIdentifier, setInboxIdentifier] = useState("");
  const [teamId, setTeamId] = useState<string>("");

  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !group) return;

    setName(group.name ?? "");
    setDescription(group.description ?? "");
    setIsActive(Boolean(group.is_active));
    setSlaMinutes(
      group.default_sla_minutes !== null && group.default_sla_minutes !== undefined
        ? String(group.default_sla_minutes)
        : ""
    );
    setInboxIdentifier(group.chatwoot_inbox_identifier ?? "");
    setTeamId(
      group.chatwoot_team_id !== null && group.chatwoot_team_id !== undefined
        ? String(group.chatwoot_team_id)
        : ""
    );
    setSelectedMemberIds(uniq((group.members ?? []).map((m) => m.id)));

    setSaving(false);
    setError(null);
  }, [isOpen, group]);

  const toggleMember = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!group) return;

    setError(null);
    if (!name.trim()) {
      setError("Nome do grupo é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const payload: UpdateSupportGroupInput = {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        is_active: isActive,
        default_sla_minutes: slaMinutes.trim() ? Number(slaMinutes) : null,
        chatwoot_inbox_identifier: inboxIdentifier.trim() ? inboxIdentifier.trim() : null,
        chatwoot_team_id: teamId.trim() ? Number(teamId) : null,
        member_ids: uniq(selectedMemberIds),
      };

      await updateSupportGroup(group.id, payload);
      await onSaved();
    } catch (err: any) {
      setError(err?.message ?? "Falha ao atualizar grupo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={group ? `Editar grupo • ${group.name}` : "Editar grupo"}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
    >
      {!group ? (
        <div className="text-xs text-slate-400">Nenhum grupo selecionado.</div>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição (opcional)
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  SLA padrão (min)
                </label>
                <input
                  value={slaMinutes}
                  onChange={(e) => setSlaMinutes(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Chatwoot Inbox Identifier
                </label>
                <input
                  value={inboxIdentifier}
                  onChange={(e) => setInboxIdentifier(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Chatwoot Team ID (opcional)
                </label>
                <input
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs font-semibold text-slate-100">Membros</div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(u.id)}
                      onChange={() => toggleMember(u.id)}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{u.full_name}</span>
                    <span className="text-[10px] text-slate-500">{u.email}</span>
                  </label>
                ))}
                {users.length === 0 && (
                  <div className="text-xs text-slate-500">Nenhum usuário cadastrado ainda.</div>
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

export default EditGroupModal;
