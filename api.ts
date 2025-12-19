// src/features/reports/api.ts
import { apiGet } from "../../api/client";
import type {
  AlertsSummaryReport,
  BuildingSummaryReport,
  GatewayOccupancyReport,
  GatewayTimeOfDayDistribution,
  GatewayUsageSummary,
  Granularity,
  PersonAlertsReport,
  PersonGroupAlertsReport,
  PersonGroupPresenceSummary,
  PersonPresenceSummary,
  PersonTimeDistributionCalendar,
  PersonTimeOfDayByGateway,
  PersonTimeOfDayDistribution,
  ReportsOverviewResponse,
  TimeBucket,
} from "./types";

export type WindowParams = {
  from_ts?: string;
  to_ts?: string;
  min_duration_seconds?: number;
};

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const reportsApi = {
  overview: (params: {
    from_ts?: string;
    to_ts?: string;
    device_id?: number;
    tag_id?: number;
  }) => apiGet<ReportsOverviewResponse>(`/reports/overview${qs(params)}`),

  // Person
  personSummary: (personId: number, params: WindowParams) =>
    apiGet<PersonPresenceSummary>(`/reports/person/${personId}/summary${qs(params)}`),

  personTimeline: (
    personId: number,
    params: WindowParams & { limit?: number }
  ) =>
    apiGet<
      Array<{
        device_id: number;
        device_name?: string | null;
        started_at: string;
        ended_at: string;
        duration_seconds: number;
        samples_count: number;
      }>
    >(`/reports/person/${personId}/timeline${qs(params)}`),

  personCalendar: (
    personId: number,
    params: WindowParams & { granularity: Granularity }
  ) =>
    apiGet<PersonTimeDistributionCalendar>(
      `/reports/person/${personId}/time-distribution/calendar${qs(params)}`
    ),

  personHourOfDay: (personId: number, params: WindowParams) =>
    apiGet<PersonTimeOfDayDistribution>(
      `/reports/person/${personId}/time-distribution/hour-of-day${qs(params)}`
    ),

  personDayOfWeek: (personId: number, params: WindowParams) =>
    apiGet<
      {
        person_id: number;
        person_full_name: string;
        from_ts?: string | null;
        to_ts?: string | null;
        buckets: Array<{
          day_of_week: number;
          total_dwell_seconds: number;
          sessions_count: number;
        }>;
      }
    >(`/reports/person/${personId}/time-distribution/day-of-week${qs(params)}`),

  personHourByGateway: (personId: number, params: WindowParams) =>
    apiGet<PersonTimeOfDayByGateway>(
      `/reports/person/${personId}/time-distribution/hour-by-gateway${qs(params)}`
    ),

  personAlerts: (
    personId: number,
    params: {
      from_ts?: string;
      to_ts?: string;
      event_type?: string;
      device_id?: number;
      max_events?: number;
    }
  ) => apiGet<PersonAlertsReport>(`/reports/person/${personId}/alerts${qs(params)}`),

  // Person Group
  groupPresenceSummary: (groupId: number, params: WindowParams) =>
    apiGet<PersonGroupPresenceSummary>(
      `/reports/person-group/${groupId}/summary${qs(params)}`
    ),

  groupAlerts: (groupId: number, params: { from_ts?: string; to_ts?: string }) =>
    apiGet<PersonGroupAlertsReport>(`/reports/person-group/${groupId}/alerts${qs(params)}`),

  // Gateways
  gatewaysUsageSummary: (params: WindowParams & {
    building_id?: number;
    floor_id?: number;
    floor_plan_id?: number;
    device_id?: number;
  }) => apiGet<GatewayUsageSummary>(`/reports/gateways/usage-summary${qs(params)}`),

  gatewayTimeOfDay: (deviceId: number, params: WindowParams) =>
    apiGet<GatewayTimeOfDayDistribution>(
      `/reports/gateways/${deviceId}/time-of-day${qs(params)}`
    ),

  gatewayOccupancy: (
    deviceId: number,
    params: { from_ts: string; to_ts: string; bucket?: "hour" }
  ) =>
    apiGet<GatewayOccupancyReport>(
      `/reports/gateways/${deviceId}/occupancy${qs(params)}`
    ),

  gatewayAlertsSummary: (deviceId: number, params: { from_ts?: string; to_ts?: string }) =>
    apiGet<AlertsSummaryReport>(
      `/reports/gateways/${deviceId}/alerts/summary${qs(params)}`
    ),

  // Building
  buildingSummary: (buildingId: number, params: WindowParams) =>
    apiGet<BuildingSummaryReport>(
      `/reports/buildings/${buildingId}/summary${qs(params)}`
    ),

  buildingTimeOfDay: (buildingId: number, params: { from_ts: string; to_ts: string }) =>
    apiGet<TimeBucket[]>(`/reports/buildings/${buildingId}/time-of-day${qs(params)}`),

  buildingCalendar: (
    buildingId: number,
    params: { from_ts: string; to_ts: string; granularity: Granularity }
  ) =>
    apiGet<TimeBucket[]>(
      `/reports/buildings/${buildingId}/time-distribution/calendar${qs(params)}`
    ),

  buildingAlertsSummary: (buildingId: number, params: { from_ts?: string; to_ts?: string }) =>
    apiGet<AlertsSummaryReport>(
      `/reports/buildings/${buildingId}/alerts/summary${qs(params)}`
    ),
};
