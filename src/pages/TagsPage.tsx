// src/pages/TagsPage.tsx
import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import type { TagEntity } from "../api/types";

export default function TagsPage() {
  const [items, setItems] = useState<TagEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mac, setMac] = useState("");
  const [label, setLabel] = useState("");
  const [personId, setPersonId] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<TagEntity[]>("/tags/");
      setItems(data);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar tags");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mac) return;

    try {
      setError(null);
      await apiPost<any, TagEntity>("/tags/", {
        mac_address: mac,
        label: label || null,
        person_id: personId ? Number(personId) : null,
        active: true,
        notes: null,
      });
      setMac("");
      setLabel("");
      setPersonId("");
      await load();
    } catch (err) {
      console.error(err);
      setError("Erro ao criar tag");
    }
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Tags</h1>
      <p className="dashboard-subtitle">
        Cadastro de TAGs BLE e vinculação opcional a uma pessoa (via ID).
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="MAC da TAG (ex: AA:BB:CC:DD:EE:FF)"
            value={mac}
            onChange={(e) => setMac(e.target.value)}
          />
          <input
            type="text"
            placeholder="Rótulo (opcional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            type="number"
            placeholder="ID da pessoa (opcional)"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          />
          <button type="submit">Adicionar</button>
        </div>
      </form>

      {loading && <p className="state-message">Carregando tags...</p>}
      {error && <p className="state-message state-message-error">{error}</p>}

      {!loading && items.length === 0 && (
        <p className="state-message">Nenhuma tag cadastrada ainda.</p>
      )}

      {items.length > 0 && (
        <div className="card" style={{ marginTop: "0.5rem" }}>
          <div className="card-title">Lista de tags</div>
          <table style={{ width: "100%", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th align="left">ID</th>
                <th align="left">MAC</th>
                <th align="left">Rótulo</th>
                <th align="left">ID Pessoa</th>
                <th align="left">Ativa</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.mac_address}</td>
                  <td>{t.label ?? "-"}</td>
                  <td>{t.person_id ?? "-"}</td>
                  <td>{t.active ? "Sim" : "Não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
