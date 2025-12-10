// src/pages/PeopleAndTagsPage.tsx
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "../api/client";

interface PersonGroup {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Person {
  id: number;
  full_name: string;
  document_id?: string | null;
  notes?: string | null;
  // 👇 assumindo que o backend retorna os grupos da pessoa
  groups?: PersonGroup[];
}

interface Tag {
  id: number;
  mac_address: string;
  label?: string | null;
  person_id: number;
  is_active?: boolean;
}

const PeopleAndTagsPage = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [groups, setGroups] = useState<PersonGroup[]>([]);

  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  // criação de pessoa
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonDoc, setNewPersonDoc] = useState("");

  // criação de TAG
  const [tagMac, setTagMac] = useState("");
  const [tagLabel, setTagLabel] = useState("");

  // criação de grupo
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  const loadAll = async () => {
    const [peopleData, tagsData, groupsData] = await Promise.all([
      apiGet<Person[]>("/people/"),
      apiGet<Tag[]>("/tags/"),
      apiGet<PersonGroup[]>("/person-groups/"),
    ]);

    setPeople(peopleData);
    setTags(tagsData);
    setGroups(groupsData);

    if (!selectedPersonId && peopleData.length > 0) {
      setSelectedPersonId(peopleData[0].id);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPerson =
    people.find((p) => p.id === selectedPersonId) ?? null;

  const tagsForCurrent = currentPerson
    ? tags.filter((t) => t.person_id === currentPerson.id)
    : [];

  const currentPersonGroupIds = currentPerson?.groups?.map((g) => g.id) ?? [];

  // ---- Pessoas ----
  const handleCreatePerson = async () => {
    if (!newPersonName.trim()) return;

    const payload = {
      full_name: newPersonName.trim(),
      document_id: newPersonDoc.trim() || null,
      notes: null,
    };

    const created = await apiPost<Person>("/people/", payload);
    setPeople((prev) => [...prev, created]);
    setNewPersonName("");
    setNewPersonDoc("");

    if (!selectedPersonId) {
      setSelectedPersonId(created.id);
    }
  };

  // ---- TAGs ----
  const handleCreateTagForSelectedPerson = async () => {
    if (!currentPerson) return;
    if (!tagMac.trim()) return;

    const payload = {
      mac_address: tagMac.trim(),
      label: tagLabel.trim() || null,
      person_id: currentPerson.id,
      is_active: true,
    };

    const created = await apiPost<Tag>("/tags/", payload);
    setTags((prev) => [...prev, created]);
    setTagMac("");
    setTagLabel("");
  };

  // ---- Grupos ----
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    const payload = {
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || null,
    };

    const created = await apiPost<PersonGroup>("/person-groups/", payload);
    setGroups((prev) => [...prev, created]);
    setNewGroupName("");
    setNewGroupDescription("");
  };

  const handleTogglePersonGroup = async (groupId: number) => {
    if (!currentPerson) return;

    const hasGroup = currentPersonGroupIds.includes(groupId);
    const newGroupIds = hasGroup
      ? currentPersonGroupIds.filter((id) => id !== groupId)
      : [...currentPersonGroupIds, groupId];

    // 👇 assumindo que o backend aceita group_ids em PUT /people/{id}
    const updated = await apiPut<Person>(`/people/${currentPerson.id}`, {
      group_ids: newGroupIds,
    });

    setPeople((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      {/* COLUNA ESQUERDA – Pessoas */}
      <div>
        <h2 className="text-lg font-semibold text-slate-50 mb-3">
          Pessoas
        </h2>

        <div className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Nome completo"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 mb-2"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Documento (opcional)"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 mb-2"
            value={newPersonDoc}
            onChange={(e) => setNewPersonDoc(e.target.value)}
          />
          <button
            onClick={handleCreatePerson}
            className="text-xs px-3 py-1 rounded bg-sv-accent text-white hover:bg-sv-accentSoft"
          >
            Adicionar pessoa
          </button>
        </div>

        <div className="border border-slate-800 rounded-lg overflow-hidden">
          {people.map((p) => {
            const isActive = p.id === selectedPersonId;
            const groupNames = p.groups?.map((g) => g.name).join(", ");

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPersonId(p.id)}
                className={`px-3 py-2 text-sm border-b border-slate-800 last:border-b-0 cursor-pointer
                  ${
                    isActive
                      ? "bg-sv-accent/80 text-white"
                      : "bg-slate-950 text-slate-200 hover:bg-slate-900"
                  }`}
              >
                <div className="font-medium">{p.full_name}</div>
                {p.document_id && (
                  <div className="text-[11px] text-slate-400">
                    Doc: {p.document_id}
                  </div>
                )}
                {groupNames && (
                  <div className="text-[10px] text-slate-300 mt-1">
                    Grupos: {groupNames}
                  </div>
                )}
              </div>
            );
          })}
          {people.length === 0 && (
            <div className="px-3 py-3 text-xs text-slate-500">
              Nenhuma pessoa cadastrada ainda.
            </div>
          )}
        </div>
      </div>

      {/* COLUNA DIREITA – Grupos + TAGs da pessoa selecionada */}
      <div className="space-y-4">
        {/* Bloco de Grupos */}
        <div className="border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">
                Grupos de pessoas
              </h2>
              <p className="text-xs text-slate-400">
                Use grupos para criar regras de alerta por setor (p. ex.:
                “Visitantes”, “Manutenção”, “Diretoria”).
              </p>
            </div>
          </div>

          {/* Criar grupo */}
          <div className="mt-3 mb-3 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nome do grupo"
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Descrição (opcional)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
            />
            <button
              onClick={handleCreateGroup}
              className="text-xs px-3 py-1 rounded bg-sv-accent text-white hover:bg-sv-accentSoft"
            >
              Criar grupo
            </button>
          </div>

          {/* Associação da pessoa a grupos */}
          {currentPerson ? (
            <>
              <div className="border-t border-slate-800 mt-2 pt-2">
                <div className="text-xs text-slate-300 mb-1">
                  Grupos de{" "}
                  <span className="font-semibold">
                    {currentPerson.full_name}
                  </span>
                  :
                </div>
                {groups.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    Nenhum grupo cadastrado ainda.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {groups.map((g) => {
                      const checked = currentPersonGroupIds.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] cursor-pointer
                            ${
                              checked
                                ? "border-sv-accent bg-sv-accent/20 text-slate-50"
                                : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                            }`}
                        >
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={checked}
                            onChange={() => void handleTogglePersonGroup(g.id)}
                          />
                          <span>{g.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-slate-500">
              Selecione uma pessoa à esquerda para vincular aos grupos.
            </div>
          )}
        </div>

        {/* Bloco de TAGs */}
        <div>
          <h2 className="text-lg font-semibold text-slate-50 mb-1">
            TAGs BLE
          </h2>
          <p className="text-sm text-slate-400 mb-2">
            As TAGs só podem ser criadas a partir de uma pessoa. Sempre
            haverá associação TAG → Pessoa.
          </p>

          {currentPerson ? (
            <>
              <div className="border border-slate-800 rounded-lg p-3 mb-3">
                <div className="text-sm text-slate-200 mb-2">
                  Nova TAG para{" "}
                  <span className="font-semibold">
                    {currentPerson.full_name}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="MAC da TAG (ex: AA:BB:CC:DD:EE:FF)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100"
                    value={tagMac}
                    onChange={(e) => setTagMac(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Rótulo / apelido (opcional)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100"
                    value={tagLabel}
                    onChange={(e) => setTagLabel(e.target.value)}
                  />
                  <button
                    onClick={handleCreateTagForSelectedPerson}
                    className="text-xs px-3 py-1 rounded bg-sv-accent text-white hover:bg-sv-accentSoft"
                  >
                    Adicionar TAG
                  </button>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-200">
                  TAGs de {currentPerson.full_name}
                </div>
                {tagsForCurrent.length === 0 && (
                  <div className="px-3 py-3 text-xs text-slate-500">
                    Nenhuma TAG associada a esta pessoa.
                  </div>
                )}
                {tagsForCurrent.map((t) => (
                  <div
                    key={t.id}
                    className="px-3 py-2 text-sm border-b border-slate-800 last:border-b-0 bg-slate-950 text-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {t.label || "(sem rótulo)"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        MAC: {t.mac_address}
                      </div>
                    </div>
                    {t.is_active === false && (
                      <span className="text-[10px] text-amber-400">
                        Inativa
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">
              Selecione ou cadastre uma pessoa para gerenciar TAGs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeopleAndTagsPage;
