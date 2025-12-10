// src/pages/BuildingsPage.tsx
import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import type { Building } from "../api/types";

export default function BuildingsPage() {
  const [items, setItems] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<Building[]>("/buildings/");
      setItems(data);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar prédios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !code) return;

    try {
      setError(null);
      await apiPost<any, Building>("/buildings/", {
        name,
        code,
        description: description || null,
      });
      setName("");
      setCode("");
      setDescription("");
      await load();
    } catch (err) {
      console.error(err);
      setError("Erro ao criar prédio");
    }
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Prédios</h1>
      <p className="dashboard-subtitle">
        Cadastro simples de prédios para organizar andares e plantas.
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Código"
            value={code}
            onChange={(e) => setCode(e.target.value)}
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

      {loading && <p className="state-message">Carregando prédios...</p>}
      {error && <p className="state-message state-message-error">{error}</p>}

      {!loading && items.length === 0 && (
        <p className="state-message">Nenhum prédio cadastrado ainda.</p>
      )}

      {items.length > 0 && (
        <div className="card" style={{ marginTop: "0.5rem" }}>
          <div className="card-title">Lista de prédios</div>
          <table style={{ width: "100%", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th align="left">ID</th>
                <th align="left">Nome</th>
                <th align="left">Código</th>
                <th align="left">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.name}</td>
                  <td>{b.code}</td>
                  <td>{b.description ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
