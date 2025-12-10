// src/pages/TrackingByDevicePage.tsx
import { useEffect, useState } from "react";
import { apiGet } from "../api/client";
import type { DeviceCurrentOccupancy } from "../api/types";

type LoadState = "idle" | "loading" | "loaded" | "error";

export default function TrackingByDevicePage() {
  const [state, setState] = useState<LoadState>("idle");
  const [data, setData] = useState<DeviceCurrentOccupancy[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setState("loading");
      setError(null);
      const result = await apiGet<DeviceCurrentOccupancy[]>(
        "/positions/by-device"
      );
      setData(result);
      setState("loaded");
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar rastreamento por gateway");
      setState("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Rastreamento por gateway</h1>
      <p className="dashboard-subtitle">
        Mostra quem está em cada gateway/setor com base na última leitura.
      </p>

      <button onClick={load} style={{ marginBottom: "0.75rem" }}>
        Recarregar
      </button>

      {state === "loading" && (
        <p className="state-message">Carregando posições...</p>
      )}
      {state === "error" && error && (
        <p className="state-message state-message-error">{error}</p>
      )}

      {state === "loaded" && data.length === 0 && (
        <p className="state-message">
          Nenhuma pessoa detectada nos gateways no momento.
        </p>
      )}

      {state === "loaded" && data.length > 0 && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {data.map((gw) => (
            <div className="card" key={gw.device_id}>
              <div className="card-title">
                Gateway {gw.device_name}{" "}
                {gw.building_name && gw.floor_name && gw.floor_plan_name
                  ? `– ${gw.building_name} / ${gw.floor_name} / ${gw.floor_plan_name}`
                  : ""}
              </div>
              <div className="card-caption">
                MAC: {gw.device_mac_address ?? "-"} – Pessoas presentes:{" "}
                {gw.people.length}
              </div>

              {gw.people.length > 0 && (
                <table
                  style={{
                    width: "100%",
                    fontSize: "0.85rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <thead>
                    <tr>
                      <th align="left">Pessoa</th>
                      <th align="left">TAG</th>
                      <th align="left">Última leitura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gw.people.map((p) => (
                      <tr key={`${gw.device_id}-${p.person_id}-${p.tag_id}`}>
                        <td>{p.person_full_name}</td>
                        <td>{p.tag_mac_address}</td>
                        <td>
                          {new Date(p.last_seen_at).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
