import { useLocation } from "react-router-dom";
import { useTweaks } from "../../context/TweaksContext";
import { SH } from "../../components/ui/SH";
import { CTODashboard } from "./CTODashboard";
import { VPDashboard } from "./VPDashboard";
import { TLDashboard } from "./TLDashboard";
import { DevOpsDashboard } from "./DevOpsDashboard";
import { ICDashboard } from "./ICDashboard";

const dashboardMap = {
  "/dash-cto": CTODashboard,
  "/dash-vp": VPDashboard,
  "/dash-tl": TLDashboard,
  "/dash-devops": DevOpsDashboard,
  "/dash-ic": ICDashboard,
};

const dashboardHeaderMap = {
  "/dash-cto": {
    title: "CTO synthetic dashboard",
    right: "Demo data · leadership view",
  },
  "/dash-vp": {
    title: "VP Engineering synthetic dashboard",
    right: "Demo data · delivery health",
  },
  "/dash-tl": {
    title: "Tech Lead synthetic dashboard",
    right: "Demo data · team execution",
  },
  "/dash-devops": {
    title: "DevOps / SRE synthetic dashboard",
    right: "Demo data · reliability preview",
  },
  "/dash-ic": {
    title: "Individual contributor synthetic dashboard",
    right: "Demo data · personal view",
  },
};

export const RoleDashboardScreen = () => {
  const location = useLocation();
  const { tweaks } = useTweaks();
  const density = tweaks.density;
  const padding = { compact: '16px 20px', comfortable: '24px 28px', spacious: '32px 36px' }[density];
  const gap = { compact: 10, comfortable: 12, spacious: 16 }[density];

  const path = location.pathname || "/dash-cto";
  const DashboardComponent = dashboardMap[path];
  const header = dashboardHeaderMap[path];

  if (!DashboardComponent) {
    return (
      <div style={{ flex: 1, padding: 40, color: "var(--text)" }}>
        <h2>Dashboard not found</h2>
        <p>Path: {path}</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding, overflow: 'auto' }}>
      <SH title={header.title} right={header.right} />
      <div style={{ marginTop: gap }}>
        <DashboardComponent />
      </div>
    </div>
  );
};
