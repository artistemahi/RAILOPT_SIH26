import { StatusBadge } from "./StatusBadge";

export interface StationNode {
  id: string;
  name: string;
  km: number;
  state: "clear" | "busy" | "block" | "watch";
  details?: string;
}

interface CorridorSchematicProps {
  stations: StationNode[];
  selectedStation?: string;
  onSelectStation?: (id: string) => void;
  activeBlockSection?: string;
  className?: string;
}

export function CorridorSchematic({
  stations,
  selectedStation,
  onSelectStation,
  activeBlockSection,
  className = "",
}: CorridorSchematicProps) {
  return (
    <div className={`rail-corridor-schematic ${className}`}>
      <div className="schematic-track-canvas">
        <div className="schematic-track-line primary-track" />
        <div className="schematic-track-line secondary-track" />

        <div className="schematic-stations-list">
          {stations.map((st, idx) => {
            const isSelected = selectedStation === st.id;
            const isBlock = st.state === "block";
            const stateLabels: Record<string, string> = {
              clear: "CLEAR",
              busy: "BUSY",
              block: "BLOCK ACTIVE",
              watch: "UNDER WATCH",
            };

            return (
              <div
                key={st.id}
                className={`station-node state-${st.state} ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectStation?.(st.id)}
                role="button"
                tabIndex={0}
                title={`${st.name} (Km ${st.km}) - ${stateLabels[st.state] || st.state}`}
              >
                <div className="station-pylon">
                  <div className="node-marker">
                    <span className="inner-indicator" />
                  </div>
                </div>
                <div className="station-info">
                  <div className="station-code">{st.id}</div>
                  <div className="station-name">{st.name}</div>
                  <div className="station-km">Km {st.km}</div>
                  <div className="station-status-pill">
                    <StatusBadge
                      status={stateLabels[st.state] || st.state}
                      size="sm"
                      dot={false}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="schematic-legend">
        <div className="legend-item">
          <span className="legend-dot clear" />
          <span>Normal Traffic</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot busy" />
          <span>High Density</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot block" />
          <span>Active Maintenance Block</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot watch" />
          <span>Caution / Speed Restriction</span>
        </div>
        {activeBlockSection && (
          <div className="active-block-notice">
            Target Possession: <strong>{activeBlockSection}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
