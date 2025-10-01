import { useState } from "react";
import HomePage from "../pages/HomePage";
import TracerPage from "../pages/TracerPage";
import AnalysisPage from "../pages/AnalysisPage";
import ConfigurationPage from "../pages/ConfigurationPage";
import { Home, Archive, BarChart3, Wrench } from "lucide-react";
import "./Dashboard.css";
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("home");

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "tracer", label: "Tracer", icon: Archive },
    { id: "analysis", label: "Analysis", icon: BarChart3 },
    { id: "configuration", label: "Configuration", icon: Wrench },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomePage />;
      case "tracer":
        return <TracerPage />;
      case "analysis":
        return <AnalysisPage />;
      case "configuration":
        return <ConfigurationPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="layout">
      {/* Fixed Left Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>API Management</h2>
        </div>
        <div class="gradient-line"></div>
        <nav className="sidebar-nav">
          <ul>
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-btn ${
                      activeTab === tab.id ? "active" : ""
                    }`}
                  >
                    <div
                      className={`icon-box ${
                        activeTab === tab.id ? "active" : ""
                      }`}
                    >
                      <IconComponent
                        size={18}
                        color={activeTab !== tab.id ? "#0075FF" : "white"}
                      />
                    </div>
                    <span>{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div class="gradient-line1"></div>
        </nav>
      </div>

      {/* Dynamic Right Content Area */}
      <div className="content">{renderContent()}</div>
    </div>
  );
};

export default Dashboard;
