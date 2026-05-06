import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import { TweaksProvider } from "./context/TweaksContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { DashboardScreen } from "./features/dashboard/DashboardScreen";
import { RoleDashboardScreen } from "./features/roleDashboards";
import { DashboardWizardScreen } from "./features/dashboardWizard/DashboardWizardScreen";
import { MetricsScreen } from "./features/metricsExplorer/MetricsScreen";
import { AIScreen } from "./features/aiAssistant/AIScreen";
import { PluginScreen } from "./features/marketplace/PluginScreen";
import { WizardScreen } from "./features/onboarding/WizardScreen";
import { PlaceholderScreen } from "./components/ui/PlaceholderScreen";

const routeConfig = {
  "/": ["Overview", "Synthetic demo data · not live company data"],
  "/dash-cto": ["CTO Dashboard", "Synthetic DORA trends, health score, and team velocity"],
  "/dash-vp": ["VP Engineering", "Synthetic delivery health and team performance"],
  "/dash-tl": ["Tech Lead", "Synthetic CI health, PR queue, and sprint progress"],
  "/dash-devops": ["DevOps / SRE", "Synthetic deploy frequency, MTTR, and incident trends"],
  "/dash-ic": ["My Dashboard", "Synthetic personal metrics and sprint tasks"],
  "/dash-wizard": ["Dashboard Preview", "Synthetic dashboard builder preview"],
  "/metrics": ["Metrics Explorer", "Synthetic DORA, CI/CD, PR, and custom metrics"],
  "/ai": ["Synthetic AI Preview", "Scripted demo · not live inference"],
  "/plugins": ["Plugin Preview", "Mock listings · install flow not implemented"],
  "/wizard": ["Connector Setup Preview", "Synthetic flow · do not enter credentials or tokens"],
  "/settings": ["Settings", "Demo configuration preview"],
};

const AppLayout = ({ children }) => {
  const location = useLocation();
  const path = location.pathname || "/";
  const [title, subtitle] = routeConfig[path] || ["Metraly", "Synthetic demo preview"];

  return (
    <TweaksProvider>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar />
        <div
          className="main-content"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Topbar title={title} subtitle={subtitle} />
          <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
        </div>
      </div>
    </TweaksProvider>
  );
};

const App = () => {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/dash-cto" element={<RoleDashboardScreen />} />
        <Route path="/dash-vp" element={<RoleDashboardScreen />} />
        <Route path="/dash-tl" element={<RoleDashboardScreen />} />
        <Route path="/dash-devops" element={<RoleDashboardScreen />} />
        <Route path="/dash-ic" element={<RoleDashboardScreen />} />
        <Route path="/dash-wizard" element={<DashboardWizardScreen />} />
        <Route path="/metrics" element={<MetricsScreen />} />
        <Route path="/ai" element={<AIScreen />} />
        <Route path="/plugins" element={<PluginScreen />} />
        <Route path="/wizard" element={<WizardScreen />} />
        <Route path="/settings" element={<PlaceholderScreen />} />
      </Routes>
    </AppLayout>
  );
};

export default App;
