// src/api/types.ts

// GET /api/v1/dashboard/summary
export interface DashboardSummary {
    total_people: number;
    total_tags: number;
    total_gateways: number;
    gateways_online: number;
    gateways_offline: number;
    active_alert_rules: number;
    recent_alerts_24h: number;
  }
  
  // GET /api/v1/devices/status
  export interface DeviceStatus {
    id: number;
    name: string;
    mac_address: string | null;
    last_seen_at: string | null;
    is_online: boolean;
  }
  
  // GET /api/v1/positions/by-device
  export interface PersonCurrentLocation {
    person_id: number;
    person_full_name: string;
    tag_id: number;
    tag_mac_address: string;
    device_id: number;
    device_name: string;
    device_mac_address: string | null;
    device_pos_x: number | null;
    device_pos_y: number | null;
    floor_plan_id: number;
    floor_plan_name: string;
    floor_plan_image_url: string | null;
    floor_id: number;
    floor_name: string;
    building_id: number;
    building_name: string;
    last_seen_at: string; // ISO string
  }
  
  export interface DeviceCurrentOccupancy {
    device_id: number;
    device_name: string;
    device_mac_address: string | null;
    device_pos_x: number | null;
    device_pos_y: number | null;
    floor_plan_id: number | null;
    floor_plan_name: string | null;
    floor_plan_image_url: string | null;
    floor_id: number | null;
    floor_name: string | null;
    building_id: number | null;
    building_name: string | null;
    people: PersonCurrentLocation[];
  }

  export interface Building {
    id: number;
    name: string;
    code: string;
    description: string | null;
  }
  
  export interface Person {
    id: number;
    full_name: string;
    document_id: string | null;
    email: string | null;
    active: boolean;
    notes: string | null;
  }
  
  export interface TagEntity {
    id: number;
    mac_address: string;
    label: string | null;
    person_id: number | null;
    active: boolean;
    notes: string | null;
  }
  
  export interface AlertRule {
    id: number;
    name: string;
    description: string | null;
    rule_type: string;
    group_id: number | null;
    device_id: number | null;
    max_dwell_seconds: number | null;
    is_active: boolean;
  }
  
  // src/api/types.ts

export interface Floor {
  id: number;
  building_id: number;
  name: string;
  level: number | null;
  description: string | null;
}

export interface FloorPlan {
  id: number;
  floor_id: number;
  name: string;
  image_url: string | null;
  width: number | null;
  height: number | null;
  description: string | null;
}

export interface DeviceEntity {
  id: number;
  name: string;
  code: string | null;
  type: string;
  mac_address: string | null;
  description: string | null;
  floor_plan_id: number | null;
  pos_x: number | null;
  pos_y: number | null;
}

export interface Incident {
  id: number;
  device_id: number;
  device_event_id: number | null;
  kind: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "FALSE_POSITIVE" | "CANCELED";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string | null;

  tenant?: string | null;
  sla_minutes?: number | null;
  due_at?: string | null;

  created_at: string;
  updated_at: string;
  closed_at: string | null;
}


export interface IncidentMessage {
  id: number;
  incident_id: number;
  message_type: "SYSTEM" | "COMMENT" | "MEDIA";
  content: string | null;

  media_type: "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | null;
  media_url: string | null;
  media_thumb_url: string | null;
  media_name: string | null;

  // 👇 novo campo
  author_name?: string | null;

  created_at: string;
}