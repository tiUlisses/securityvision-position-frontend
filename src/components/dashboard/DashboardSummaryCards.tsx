// src/components/dashboard/DashboardSummaryCards.tsx
import type { DashboardSummary } from "../../api/types";

interface Props {
  summary: DashboardSummary;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function DashboardSummaryCards({ summary }: Props) {
  return (
    <div className="dashboard-grid" data-testid="dashboard-summary-cards">
      <div className="card">
        <div className="card-title">Pessoas rastreadas</div>
        <div className="card-value">{formatNumber(summary.total_people)}</div>
        <div className="card-caption">Total de pessoas cadastradas no sistema</div>
      </div>

      <div className="card">
        <div className="card-title">Tags ativas</div>
        <div className="card-value">{formatNumber(summary.total_tags)}</div>
        <div className="card-caption">
          Quantidade de TAGs BLE vinculadas (pessoas + ativos)
        </div>
      </div>

      <div className="card">
        <div className="card-title">Gateways</div>
        <div className="card-value">{formatNumber(summary.total_gateways)}</div>
        <div className="card-caption">Total de gateways BLE cadastrados</div>
      </div>

      <div className="card">
        <div className="card-title">Gateways online</div>
        <div className="card-value card-value-green">
          {formatNumber(summary.gateways_online)}
        </div>
        <div className="card-caption">
          {formatNumber(summary.gateways_offline)} offline
        </div>
      </div>

      <div className="card">
        <div className="card-title">Regras de alerta ativas</div>
        <div className="card-value">
          {formatNumber(summary.active_alert_rules)}
        </div>
        <div className="card-caption">Regras monitorando setores e grupos</div>
      </div>

      <div className="card">
        <div className="card-title">Alertas nas últimas 24h</div>
        <div className="card-value card-value-red">
          {formatNumber(summary.recent_alerts_24h)}
        </div>
        <div className="card-caption">Eventos disparados (webhook/log)</div>
      </div>
    </div>
  );
}
