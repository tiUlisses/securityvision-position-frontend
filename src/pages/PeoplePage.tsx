// src/pages/PeoplePage.tsx
import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import type { Person } from "../api/types";

export default function PeoplePage() {
  const [items, setItems] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [email, setEmail] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<Person[]>("/people/");
      setItems(data);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar pessoas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName) return;

    try {
      setError(null);
      await apiPost<any, Person>("/people/", {
        full_name: fullName,
        document_id: documentId || null,
        email: email || null,
        active: true,
        notes: null,
      });
      setFullName("");
      setDocumentId("");
      setEmail("");
      await load();
    } catch (err) {
      console.error(err);
      setError("Erro ao criar pessoa");
    }
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Pessoas</h1>
      <p className="dashboard-subtitle">
        Cadastro de pessoas que serão rastreadas por TAGs BLE.
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Documento (CPF, etc.)"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
          />
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">Adicionar</button>
        </div>
      </form>

      {loading && <p className="state-message">Carregando pessoas...</p>}
      {error && <p className="state-message state-message-error">{error}</p>}

      {!loading && items.length === 0 && (
        <p className="state-message">Nenhuma pessoa cadastrada ainda.</p>
      )}

      {items.length > 0 && (
        <div className="card" style={{ marginTop: "0.5rem" }}>
          <div className="card-title">Lista de pessoas</div>
          <table style={{ width: "100%", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th align="left">ID</th>
                <th align="left">Nome</th>
                <th align="left">Documento</th>
                <th align="left">E-mail</th>
                <th align="left">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.full_name}</td>
                  <td>{p.document_id ?? "-"}</td>
                  <td>{p.email ?? "-"}</td>
                  <td>{p.active ? "Sim" : "Não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
