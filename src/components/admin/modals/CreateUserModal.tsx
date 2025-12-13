import React, { FormEvent, useEffect, useState } from "react";
import Modal from "../../common/Modal";

import { createUser } from "../../../api/users";
import type { CreateUserInput, UserRole, UserEntity } from "../../../api/users";

import { updateSupportGroup } from "../../../api/supportGroups";
import type { SupportGroupEntity } from "../../../api/supportGroups";

const uniq = (ids: number[]) => Array.from(new Set(ids)).sort((a, b) => a - b);

type Props = {
  isOpen: boolean;
  onClose: () => void;
  groups: SupportGroupEntity[];
  onSaved: () => Promise<void> | void;
};

const CreateUserModal: React.FC<Props> = ({ isOpen, onClose, groups, onSaved }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("OPERATOR");
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFullName("");
    setEmail("");
    setRole("OPERATOR");
    setIsSuperuser(false);
    setIsActive(true);
    setPassword("");
    setConfirmPassword("");
    setSelectedGroupIds([]);
    setSaving(false);
    setError(null);
  }, [isOpen]);

  const toggleGroup = (id: number) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Preencha nome, e-mail e senha.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setSaving(true);
    try {
      const payload: CreateUserInput = {
        email: email.trim(),
        full_name: fullName.trim(),
        password,
        role,
        is_active: isActive,
        is_superuser: isSuperuser,
      };

      const newUser: UserEntity = await createUser(payload);

      // associa em grupos selecionados (fonte da verdade é o grupo)
      const targetGroups = groups.filter((g) => selectedGroupIds.includes(g.id));
      for (const g of targetGroups) {
        const current = uniq((g.members ?? []).map((m) => m.id));
        const next = uniq([...current, newUser.id]);
        await updateSupportGroup(g.id, { member_ids: next });
      }

      await onSaved();
    } catch (err: any) {
      setError(err?.message ?? "Falha ao criar usuário.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Criar usuário" onClose={onClose} maxWidthClass="max-w-3xl">
      {error && (
        <div className="mb-3 rounded-md bg-rose-500/10 border border-rose-500/40 px-3 py-2 text-xs text-rose-100">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Nome completo</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Confirmar senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
            {saving ? "Criando..." : "Criar"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;
