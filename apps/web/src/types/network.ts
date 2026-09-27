export interface NetworkStation {
  locationId: string;
  stationCode: string;
  name: string;
  latitude: number;
  longitude: number;
  assetCount: number;
  onNetwork: boolean;
}

export interface NetworkSection {
  sectionId: string;
  fromStation: string;
  toStation: string;
  path: Array<[number, number]>;
  lengthKm: number | null;
  trackCount: number | null;
  electrified: boolean | null;
  operationalStatus: string | null;
  activeTasks: number;
  p1Tasks: number;
  p2Tasks: number;
  topPriority: number | null;
  openCriticalDefects: number;
  outOfServiceAssets: number;
  availableWindows: number;
  trainsOnPlanningDate: number;
  topTasks: Array<{
    taskId: string;
    task: string;
    department: string;
    priorityScore: number;
    priority: "P1" | "P2" | "P3";
    status: string;
  }>;
}

export interface NetworkData {
  planningDate: string;
  horizonDays: number;
  stations: NetworkStation[];
  sections: NetworkSection[];
}
