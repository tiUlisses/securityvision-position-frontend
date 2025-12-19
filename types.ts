// src/features/reports/types.ts
// Tipos do frontend alinhados com as rotas refatoradas em app/api/routes/reports.py

export type Granularity = "day" | "week" | "month" | "year";

export interface LocationContext {
  building_id?: number | null;
  building_name?: string | null;
  floor_id?: number | null;
  floor_name?: string | null;
  floor_plan_id?: number | null;
  floor_plan_name?: string | null;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface ReportsOverviewSummary {
  from_ts?: string | null;
  to_ts?: string | null;
  total_sessions: number;
  total_unique_tags: number;
  total_unique_devices: number;
  total_dwell_seconds: number;
  avg_dwell_seconds: number;
  first_session_at?: string | null;
  last_session_at?: string | null;
}

export interface TopItem {
  total_sessions: number;
  total_dwell_seconds: number;
}

export interface TopBuilding extends TopItem {
  building_id: number;
  building_name: string;
}

export interface TopDevice extends TopItem {
  device_id: number;
  device_name: string;
}

export interface TopPerson extends TopItem {
  person_id: number;
  person_name: string;
}

export interface ReportsOverviewResponse {
  summary: ReportsOverviewSummary;
  top_buildings: TopBuilding[];
  top_devices: TopDevice[];
  top_people: TopPerson[];
}

// ---------------------------------------------------------------------------
// Person
// ---------------------------------------------------------------------------

export interface PersonDwellByDevice extends LocationContext {
  device_id: number | null;
  device_name?: string | null;
  total_dwell_seconds: number;
  sessions_count: number;
}

export interface PersonPresenceSummary {
  person_id: number;
  person_full_name: string;
  from_ts?: string | null;
  to_ts?: string | null;
  total_dwell_seconds: number;
  total_sessions: number;
  first_session_at?: string | null;
  last_session_at?: string | null;
  dwell_by_device: PersonDwellByDevice[];
  top_device_id?: number | null;
}

export interface PersonTimeDistributionBucket {
  bucket_start: string;
  total_dwell_seconds: number;
  sessions_count: number;
}

export interface PersonTimeDistributionCalendar {
  person_id: number;
  person_full_name: string;
  from_ts?: string | null;
  to_ts?: string | null;
  granularity: Granularity;
  buckets: PersonTimeDistributionBucket[];
}

export interface PersonTimeOfDayBucket {
  hour: number; // 0..23
  total_dwell_seconds: number;
  sessions_count: number;
}

export interface PersonTimeOfDayDistribution {
  person_id: number;
  person_full_name: string;
  from_ts?: string | null;
  to_ts?: string | null;
  buckets: PersonTimeOfDayBucket[];
}

export interface PersonHourByGatewayBucket {
  hour: number; // 0..23
  device_id: number | null;
  device_name?: string | null;
  total_dwell_seconds: number;
  sessions_count: number;
}

export interface PersonTimeOfDayByGateway {
  person_id: number;
  person_full_name: string;
  from_ts?: string | null;
  to_ts?: string | null;
  buckets: PersonHourByGatewayBucket[];
}

export interface PersonTimelineSession {
  device_id: number | null;
  device_name?: string | null;
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
  samples_count: number;
}

export interface PersonAlertByType {
  event_type: string;
  alerts_count: number;
}

export interface PersonAlertByDevice extends LocationContext {
  device_id: number | null;
  device_name?: string | null;
  alerts_count: number;
}

export interface PersonAlertEvent extends LocationContext {
  id: number;
  event_type: string;
  device_id?: number | null;
  device_name?: string | null;
  tag_id?: number | null;
  started_at: string;
  ended_at?: string | null;
}

export interface PersonAlertsReport {
  person_id: number;
  person_full_name: string;
  from_ts?: string | null;
  to_ts?: string | null;
  total_alerts: number;
  first_alert_at?: string | null;
  last_alert_at?: string | null;
  by_type: PersonAlertByType[];
  by_device: PersonAlertByDevice[];
  events: PersonAlertEvent[];
}

// ---------------------------------------------------------------------------
// Person Group
// ---------------------------------------------------------------------------

export interface GroupDwellByDevice extends LocationContext {
  device_id: number | null;
  device_name?: string | null;
  total_dwell_seconds: number;
  sessions_count: number;
  unique_people_count: number;
}

export interface GroupPersonDwellSummary {
  person_id: number;
  person_full_name: string;
  total_dwell_seconds: number;
  sessions_count: number;
}

export interface PersonGroupPresenceSummary {
  group_id: number;
  group_name: string;
  from_ts?: string | null;
  to_ts?: string | null;
  total_dwell_seconds: number;
  total_sessions: number;
  total_unique_people: number;
  first_session_at?: string | null;
  last_session_at?: string | null;
  dwell_by_device: GroupDwellByDevice[];
  dwell_by_person: GroupPersonDwellSummary[];
  top_device_id?: number | null;
}

export interface PersonGroupAlertsReport {
  group_id: number;
  group_name: string;
  from_ts?: string | null;
  to_ts?: string | null;
  total_alerts: number;
  by_type: PersonAlertByType[];
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export interface GatewayUsageDeviceSummary extends LocationContext {
  device_id: number;
  device_name?: string | null;
  device_mac_address?: string | null;
  total_dwell_seconds: number;
  sessions_count: number;
  unique_people_count: number;
  first_session_at?: string | null;
  last_session_at?: string | null;
}

export interface GatewayUsageSummary {
  from_ts?: string | null;
  to_ts?: string | null;
  total_sessions: number;
  total_dwell_seconds: number;
  total_devices: number;
  gateways: GatewayUsageDeviceSummary[];
  top_device_id?: number | null;
}

export interface GatewayTimeOfDayBucket {
  hour: number;
  total_dwell_seconds: number;
  sessions_count: number;
  unique_people_count: number;
}

export interface GatewayTimeOfDayDistribution {
  device_id: number;
  device_name: string;
  from_ts?: string | null;
  to_ts?: string | null;
  buckets: GatewayTimeOfDayBucket[];
}

export interface TimeBucket {
  bucket_start: string;
  total_dwell_seconds: number;
  sessions_count: number;
  unique_tags_count: number;
  unique_people_count: number;
}

export interface PeakBucket {
  bucket_start: string;
  unique_people_count: number;
}

export interface GatewayOccupancyReport {
  device_id: number;
  device_name?: string | null;
  from_ts: string;
  to_ts: string;
  buckets: TimeBucket[];
  peak?: PeakBucket | null;
  avg_dwell_seconds?: number | null;
  p50_dwell_seconds?: number | null;
  p95_dwell_seconds?: number | null;
}

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

export interface BuildingSummaryItem {
  device_id?: number | null;
  device_name?: string | null;
  sessions_count: number;
  total_dwell_seconds: number;
  unique_people_count: number;
}

export interface BuildingSummaryReport {
  building_id: number;
  building_name: string;
  from_ts?: string | null;
  to_ts?: string | null;
  total_sessions: number;
  total_dwell_seconds: number;
  unique_people_count: number;
  unique_tags_count: number;
  avg_dwell_seconds?: number | null;
  top_gateways_by_sessions: BuildingSummaryItem[];
  top_gateways_by_dwell: BuildingSummaryItem[];
}

// ---------------------------------------------------------------------------
// Alerts summaries (gateway/building)
// ---------------------------------------------------------------------------

export interface AlertTypeCount {
  event_type: string;
  alerts_count: number;
}

export interface AlertsSummaryReport {
  scope: "gateway" | "building";
  scope_id: number;
  from_ts?: string | null;
  to_ts?: string | null;
  total_alerts: number;
  by_type: AlertTypeCount[];
}
