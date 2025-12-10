// src/pages/FloorPlansPage.tsx
import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import type { Floor, FloorPlan, Building } from "../api/types";

interface FloorWithBuilding extends Floor {
  building_name?: string;
  building_code?: string;
}

export default function FloorPlansPage() {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [floors, setFloors] = useState<FloorWithBuilding[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [floorId, setFloorId] = useState("");
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const [floorPlansData, floorsData, buildingsData] = await Promise.all([
        apiGet<FloorPlan[]>("/floor-plans/"),
        apiGet<Floor[]>("/floors/"),
        apiGet<Building[]>("/buildings/"),
      ]);

      const floorsWithB = floorsData.map((f) => {
        const b = buildingsData.find((x) => x.id === f.building_id);
        return {
          ...f,
          building_name: b?.name,
          building_code: b?.code,
        } as FloorWithBuilding;
      });

      setFloorPlans(floorPlansData);
      setFloors(floorsWithB);
      setBuildings(buildingsData);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar plantas/andares/prédios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!floorId || !name) return;

    try {
      setError(null);
      await apiPost<any, FloorPlan>("/floor-plans/", {
        floor_id: Number(floorId),
        name,
        image_url: imageUrl || null,
        width: width ? Number(width) : null,
        height: height ? Number(height) : null,
        description: description || null,
      });

      setName("");
      setImageUrl("");
      setWidth("");
      setHeight("");
      setDescription("");
      await load();
    } catch (err) {
      console.error(err);
      setError("Erro ao criar planta");
    }
  }

  function floorLabel(fp: FloorPlan): string {
    const f = floors.find((x) => x.id === fp.floor_id);
    if (!f) return `Andar #${fp.floor_id}`;
    return `${f.building_name ?? "Prédio?"} / ${f.name}`;
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Plantas baixas</h1>
      <p className="dashboard-subtitle">
        Cadastro de plantas por andar, com URL da imagem e dimensões
        (para posicionar gateways).
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <select
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
          >
            <option value="">Selecione um andar</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.building_name ?? "Prédio?"} / {f.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Nome da planta (ex: Planta recepção)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="text"
            placeholder="URL da imagem da planta"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <input
            type="number"
            placeholder="Largura (px opcional)"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />

          <input
            type="number"
            placeholder="Altura (px opcional)"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
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

      {loading && <p className="state-message">Carregando plantas...</p>}
      {error && <p className="state-message state-message-error">{error}</p>}

      {!loading && floorPlans.length === 0 && (
        <p className="state-message">Nenhuma planta cadastrada ainda.</p>
      )}

      {floorPlans.length > 0 && (
        <div className="card" style={{ marginTop: "0.5rem" }}>
          <div className="card-title">Lista de plantas</div>
          <table style={{ width: "100%", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th align="left">ID</th>
                <th align="left">Andar</th>
                <th align="left">Nome</th>
                <th align="left">Imagem</th>
                <th align="left">Dimensões</th>
              </tr>
            </thead>
            <tbody>
              {floorPlans.map((fp) => (
                <tr key={fp.id}>
                  <td>{fp.id}</td>
                  <td>{floorLabel(fp)}</td>
                  <td>{fp.name}</td>
                  <td>{fp.image_url ?? "-"}</td>
                  <td>
                    {fp.width ?? "-"} x {fp.height ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
