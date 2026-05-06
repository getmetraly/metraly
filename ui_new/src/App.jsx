import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import { TweaksProvider } from "./context/TweaksContext"; // убедитесь, что путь верный
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
  "/dash-vp": ["VP Engineering", "Synthetic delivery health & team performance"],
  "/dash-tl": ["Tech Lead", "Synthetic CI health, PR queue & sprint progress"],
  "/dash-devops": ["DevOps / SRE", "Synthetic deploy frequency, MTTR & incidents"],
  "/dash-ic": ["My Dashboard", "Synthetic personal metrics & sprint tasks"],
  "/dash-wizard": ["Dashboard Preview", "Build a mock dashboard from demo widgets"],
  "/metrics": ["Metrics Explorer", "Synthetic DORA, CI/CD, PR & custom metrics"],
  "/ai": ["Synthetic AI Preview", "Scripted demo · not live AI inference"],
  "/plugins": ["Plugin Preview", "Mock listings · install flow not implemented"],
  "/wizard": ["Connector Setup Preview", "Simulated onboarding · do not enter credentials"],
  "/settings": ["Settings", "Demo configuration"],
};

// Обёртка для шапки и боковой панели
const AppLayout = ({ children }) => {
  const location = useLocation();
  const [title, subtitle] = routeConfig[location.pathname] || ["Metraly", ""];

  return (
    <TweaksProvider>
      <Sidebar />
      <div className="main-content">
        <Topbar title={title} subtitle={subtitle} />
        {children}
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
