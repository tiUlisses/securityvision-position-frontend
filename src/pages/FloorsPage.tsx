// src/pages/FloorsPage.tsx
import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import type { Building, Floor } from "../api/types";

export default function FloorsPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [buildingId, setBuildingId] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const [floorsData, buildingsData] = await Promise.all([
        apiGet<Floor[]>("/floors/"),
        apiGet<Building[]>("/buildings/"),
      ]);

      setFloors(floorsData);
      setBuildings(buildingsData);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar andares/prédios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!buildingId || !name) return;

    try {
      setError(null);
      await apiPost<any, Floor>("/floors/", {
        building_id: Number(buildingId),
        name,
        level: level ? Number(level) : null,
        description: description || null,
      });

      setName("");
      setLevel("");
      setDescription("");
      await load();
    } catch (err) {
      console.error(err);
      setError("Erro ao criar andar");
    }
  }

  function buildingLabel(id: number): string {
    const b = buildings.find((x) => x.id === id);
    return b ? `${b.name} (${b.code})` : `#${id}`;
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Andares</h1>
      <p className="dashboard-subtitle">
        Cadastro de andares vinculados aos prédios.
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
          >
            <option value="">Selecione um prédio</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Nome do andar (ex: 1º Andar)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="number"
            placeholder="Nível (ex: 1)"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />

          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button type="submit">Adicionar</button>
        </div>
      </form>

      {loading && <p className="state-message">Carregando andares...</p>}
      {error && <p className="state-message state-message-error">{error}</p>}

      {!loading && floors.length === 0 && (
        <p className="state-message">Nenhum andar cadastrado ainda.</p>
      )}

      {floors.length > 0 && (
        <div className="card" style={{ marginTop: "0.5rem" }}>
          <div className="card-title">Lista de andares</div>
          <table style={{ width: "100%", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th align="left">ID</th>
                <th align="left">Prédio</th>
                <th align="left">Nome</th>
                <th align="left">Nível</th>
                <th align="left">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {floors.map((f) => (
                <tr key={f.id}>
                  <td>{f.id}</td>
                  <td>{buildingLabel(f.building_id)}</td>
                  <td>{f.name}</td>
                  <td>{f.level ?? "-"}</td>
                  <td>{f.description ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
