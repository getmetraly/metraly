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

const navItems = [
  { to: "/", label: "Overview", icon: "home" },
  { to: "/dash-cto", label: "CTO", icon: "trendingUp" },
  { to: "/dash-vp", label: "VP Eng", icon: "users" },
  { to: "/dash-tl", label: "Tech Lead", icon: "gitPR" },
  { to: "/dash-devops", label: "DevOps", icon: "cpu" },
  { to: "/dash-ic", label: "My View", icon: "activity" },
];

export const RoleDashboardScreen = () => {
  const location = useLocation();
  const { tweaks } = useTweaks();
  const density = tweaks.density;
  const padding = { compact: '16px 20px', comfortable: '24px 28px', spacious: '32px 36px' }[density];

  const path = location.pathname || "/dash-cto";
  const DashboardComponent = dashboardMap[path];

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
      <SH
        navItems={navItems}
        activePath={path}
        showNewDashboard
      />

      <DashboardComponent />
    </div>
  );
};
