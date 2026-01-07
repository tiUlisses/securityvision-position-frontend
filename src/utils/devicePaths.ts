export type DevicePathBuilding = {
  code?: string | null;
  name?: string | null;
} | null;

export type DevicePathFloor = {
  code?: string | null;
  name?: string | null;
} | null;

type DevicePathInput = {
  tenant?: string | null;
  building?: DevicePathBuilding;
  floor?: DevicePathFloor;
  deviceCode?: string | null;
  deviceName?: string | null;
};

const normalizeSegment = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const resolveSegment = (...values: Array<string | null | undefined>): string | null => {
  for (const value of values) {
    const normalized = normalizeSegment(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

export const buildDevicePath = ({
  tenant,
  building,
  floor,
  deviceCode,
  deviceName,
}: DevicePathInput): string | null => {
  const tenantSegment = normalizeSegment(tenant);
  const buildingSegment = resolveSegment(building?.code, building?.name);
  const floorSegment = resolveSegment(floor?.code, floor?.name);
  const deviceSegment = resolveSegment(deviceCode, deviceName);

  if (!buildingSegment || !floorSegment || !deviceSegment) {
    return null;
  }

  if (!tenantSegment) {
    return `${buildingSegment}/${floorSegment}/${deviceSegment}`;
  }

  return `${tenantSegment}/${buildingSegment}/${floorSegment}/${deviceSegment}`;
};
