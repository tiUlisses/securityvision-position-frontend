import { apiGet } from "../../api/client";
import type {
  AlertsSummaryReport,
  BuildingSummaryReport,
  GatewayOccupancyReport,
  GatewayTimeOfDayDistribution,
  GatewayUsageSummary,
  PersonAlertsReport,
  PersonPresenceSummary,
  PersonTimeDistributionCalendar,
  PersonTimeOfDayByGateway,
  ReportsOverviewResponse,
  TimeBucket,
} from "./types";

/**
 * API layer para as rotas /reports/*
 *
 * Importante: vários componentes estavam chamando métodos com prefixo `get*`.
 * Esse arquivo expõe esses nomes (e mantém aliases “sem get” para compatibilidade).
 */

export type WindowParams = {
  from_ts?: string;
  to_ts?: string;
  min_duration_seconds?: number;
};

function qs(params: Record<string, any> | undefined): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function getOverview(params: {
  from_ts?: string;
  to_ts?: string;
  device_id?: number;
  tag_id?: number;
}) {
  return apiGet<ReportsOverviewResponse>(`/reports/overview${qs(params)}`);
}

// ---------------------------------------------------------------------------
// Person
// ---------------------------------------------------------------------------

export function getPersonSummary(person_id: number, params: WindowParams = {}) {
  return apiGet<PersonPresenceSummary>(
    `/reports/person/${person_id}/summary${qs(params)}`
  );
}

export function getPersonHourByGateway(
  person_id: number,
  params: WindowParams = {}
) {
  return apiGet<PersonTimeOfDayByGateway>(
    `/reports/person/${person_id}/time-distribution/hour-by-gateway${qs(params)}`
  );
}

export function getPersonCalendar(
  person_id: number,
  params: WindowParams & {
    granularity?: "day" | "week" | "month" | "year";
  } = {}
) {
  return apiGet<PersonTimeDistributionCalendar>(
    `/reports/person/${person_id}/time-distribution/calendar${qs(params)}`
  );
}

export function getPersonAlerts(
  person_id: number,
  params: {
    from_ts?: string;
    to_ts?: string;
    event_type?: string;
    device_id?: number;
    max_events?: number;
  } = {}
) {
  return apiGet<PersonAlertsReport>(
    `/reports/person/${person_id}/alerts${qs(params)}`
  );
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export function getGatewayUsageSummary(
  params: WindowParams & {
    building_id?: number;
    floor_id?: number;
    floor_plan_id?: number;
    device_id?: number;
  } = {}
) {
  return apiGet<GatewayUsageSummary>(
    `/reports/gateways/usage-summary${qs(params)}`
  );
}

export function getGatewayTimeOfDay(
  device_id: number,
  params: WindowParams = {}
) {
  return apiGet<GatewayTimeOfDayDistribution>(
    `/reports/gateways/${device_id}/time-of-day${qs(params)}`
  );
}

export function getGatewayOccupancy(
  device_id: number,
  params: {
    from_ts?: string;
    to_ts?: string;
    bucket?: "hour";
  } = {}
) {
  return apiGet<GatewayOccupancyReport>(
    `/reports/gateways/${device_id}/occupancy${qs(params)}`
  );
}

export function getGatewayAlertsSummary(
  device_id: number,
  params: { from_ts?: string; to_ts?: string } = {}
) {
  return apiGet<AlertsSummaryReport>(
    `/reports/gateways/${device_id}/alerts/summary${qs(params)}`
  );
}

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

export function getBuildingSummary(
  building_id: number,
  params: WindowParams = {}
) {
  return apiGet<BuildingSummaryReport>(
    `/reports/buildings/${building_id}/summary${qs(params)}`
  );
}

export function getBuildingTimeOfDay(
  building_id: number,
  params: { from_ts?: string; to_ts?: string } = {}
) {
  return apiGet<TimeBucket[]>(
    `/reports/buildings/${building_id}/time-of-day${qs(params)}`
  );
}

export function getBuildingCalendar(
  building_id: number,
  params: {
    granularity?: "day" | "week" | "month" | "year";
    from_ts?: string;
    to_ts?: string;
  } = {}
) {
  return apiGet<TimeBucket[]>(
    `/reports/buildings/${building_id}/time-distribution/calendar${qs(params)}`
  );
}

export function getBuildingAlertsSummary(
  building_id: number,
  params: { from_ts?: string; to_ts?: string } = {}
) {
  return apiGet<AlertsSummaryReport>(
    `/reports/buildings/${building_id}/alerts/summary${qs(params)}`
  );
}

// ---------------------------------------------------------------------------
// Group (se você estiver usando relatórios de grupos)
// ---------------------------------------------------------------------------

export function getPersonGroupSummary(
  group_id: number,
  params: WindowParams = {}
) {
  return apiGet<any>(`/reports/person-group/${group_id}/summary${qs(params)}`);
}

export function getPersonGroupAlerts(
  group_id: number,
  params: { from_ts?: string; to_ts?: string } = {}
) {
  return apiGet<any>(`/reports/person-group/${group_id}/alerts${qs(params)}`);
}

// ---------------------------------------------------------------------------
// Export “client object” (o que os panels importam)
// ---------------------------------------------------------------------------

export const reportsApi = {
  // canonical "get*"
  getOverview,
  getPersonSummary,
  getPersonHourByGateway,
  getPersonCalendar,
  getPersonAlerts,
  getGatewayUsageSummary,
  getGatewayTimeOfDay,
  getGatewayOccupancy,
  getGatewayAlertsSummary,
  getBuildingSummary,
  getBuildingTimeOfDay,
  getBuildingCalendar,
  getBuildingAlertsSummary,
  getPersonGroupSummary,
  getPersonGroupAlerts,

  // aliases (sem get) – útil se algum lugar ainda estiver usando
  overview: getOverview,
  personSummary: getPersonSummary,
  personHourByGateway: getPersonHourByGateway,
  personCalendar: getPersonCalendar,
  personAlerts: getPersonAlerts,
  gatewaysUsageSummary: getGatewayUsageSummary,
  gatewayTimeOfDay: getGatewayTimeOfDay,
  gatewayOccupancy: getGatewayOccupancy,
  gatewayAlertsSummary: getGatewayAlertsSummary,
  buildingSummary: getBuildingSummary,
  buildingTimeOfDay: getBuildingTimeOfDay,
  buildingCalendar: getBuildingCalendar,
  buildingAlertsSummary: getBuildingAlertsSummary,
};
