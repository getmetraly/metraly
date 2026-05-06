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
  "/dash-cto": [
    "CTO Dashboard",
    "Synthetic DORA trends, health score, and team velocity",
  ],
  "/dash-v-p": ["VP Engineering", "Delivery health & team performance"],
  "/dash-t-l": ["Tech Lead", "CI health, PR queue & sprint progress"],
  "/dash-devops": ["DevOps / SRE", "Deploy frequency, MTTR & incidents"],
  "/dash-ic": ["My Dashboard", "Personal metrics & sprint tasks"],
  "/dash-wizard": ["New Dashboard", "Build a custom dashboard"],
  "/metrics": ["Metrics Explorer", "DORA, CI/CD, PR & custom metrics"],
  "/ai": ["AI Assistant", "Private · On-premise inference"],
  "/plugins": ["Plugin Marketplace", "Browse & install integrations"],
  "/wizard": ["Connect Sources", "Onboarding wizard"],
  "/settings": ["Settings", "Platform configuration"],
};

const AppLayout = ({ children }) => {
  const location = useLocation();
  const path = location.hash ? location.hash.slice(1).split("?")[0] : "/";
  const [title, subtitle] = routeConfig[path] || ["Metraly", ""];

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
          <DashboardNav />
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
        <Route path="/dash-v-p" element={<RoleDashboardScreen />} />
        <Route path="/dash-t-l" element={<RoleDashboardScreen />} />
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
