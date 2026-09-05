import type { ReactNode } from "react";

function IconWrapper({
  children,
  className = "h-4 w-4",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={className}>{children}</span>;
}

export function DashboardIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M4 4.75A.75.75 0 0 1 4.75 4h14.5A.75.75 0 0 1 20 4.75v5.5A.75.75 0 0 1 19.25 11H4.75A.75.75 0 0 1 4 10.25v-5.5ZM4 13.75A.75.75 0 0 1 4.75 13h7.5A.75.75 0 0 1 13 13.75v5.5A.75.75 0 0 1 12.25 20h-7.5A.75.75 0 0 1 4 19.25v-5.5ZM15 13.75A.75.75 0 0 1 15.75 13h3.5A.75.75 0 0 1 20 13.75v5.5A.75.75 0 0 1 19.25 20h-3.5A.75.75 0 0 1 15 19.25v-5.5Z" />
      </svg>
    </IconWrapper>
  );
}

export function RiskIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M12 3.5 18.5 6v5.7c0 4.1-2.7 7.8-6.5 9.8-3.8-2-6.5-5.7-6.5-9.8V6L12 3.5Z" />
        <path d="M12 8.5v4.5M12 16.5h.01" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

export function TrainIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <rect x="5" y="4" width="14" height="12" rx="2.5" />
        <path d="M8 18l-2 2M16 18l2 2M9 9h6M9 12h6" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

export function MapIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2Z" />
        <path d="M9 4v14M15 6v14" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

export function RecommendationIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M8 5.5h8A2.5 2.5 0 0 1 18.5 8v9A2.5 2.5 0 0 1 16 19.5H8A2.5 2.5 0 0 1 5.5 17V8A2.5 2.5 0 0 1 8 5.5Z" />
        <path d="M8 9.5h8M8 13h5" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

export function AlertIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M12 4a7 7 0 0 1 7 7v4l1.5 3h-17L5 15V11a7 7 0 0 1 7-7Z" />
        <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

export function BarChartIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M5 19V9M12 19V5M19 19v-8" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

export function CheckIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        className="h-full w-full"
      >
        <path
          d="m5 12.5 4.1 4.1L19 2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </IconWrapper>
  );
}

export function WarningTriangleIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M12 4.5 20 17a1 1 0 0 1-.9 1.5H4.9A1 1 0 0 1 4 17L12 4.5Z" />
        <path d="M12 9v4.5M12 17h.01" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

export function RefreshIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M20 11a8 8 0 1 0 2 5.3" strokeLinecap="round" />
        <path d="M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrapper>
  );
}

export function BellIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path
          d="M15 17h5l-1.3-1.2A2.6 2.6 0 0 1 18 14.3V10a6 6 0 0 0-12 0v4.3c0 .7-.3 1.3-.7 1.8L4 17h5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10.5 20a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

export function UserIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <circle cx="12" cy="8" r="3.3" />
        <path
          d="M5 19c1.7-2.8 4.4-4.2 7-4.2S17.3 16.2 19 19"
          strokeLinecap="round"
        />
      </svg>
    </IconWrapper>
  );
}

export function ClockIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrapper>
  );
}

export function InfoIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 11v5M12 7.5h.01" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

export function ArrowRightIcon() {
  return (
    <IconWrapper>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path
          d="M5 12h14M13 5l7 7-7 7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </IconWrapper>
  );
}
