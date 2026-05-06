import { Link, useLocation } from "react-router-dom";
import { useTweaks } from "../../context/TweaksContext";
import { Icon } from "../../components/shared/Icon";
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          paddingBottom: 10,
          marginBottom: 20,
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
        }}
      >
        {navItems.map((item) => {
          const active = path === item.to || (item.to === '/' && path === '/');

          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
                color: active ? 'var(--cyan)' : 'var(--muted2)',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                paddingBottom: 10,
                borderBottom: active ? '2px solid var(--cyan)' : '2px solid transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon
                name={item.icon}
                size={13}
                color={active ? 'var(--cyan)' : 'var(--muted)'}
              />
              {item.label}
            </Link>
          );
        })}
      </div>

      <DashboardComponent />
    </div>
  );
};
