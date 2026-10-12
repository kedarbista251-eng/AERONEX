import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { TacticalCOP } from './pages/TacticalCOP';
import { PredictiveAnalytics } from './pages/PredictiveAnalytics';
import { ResourceReadiness } from './pages/ResourceReadiness';
import { PlanningWorkspace } from './pages/PlanningWorkspace';
import { RecommendationReview } from './pages/RecommendationReview';
import { AlertsDataQuality } from './pages/AlertsDataQuality';
import { AuditHistory } from './pages/AuditHistory';
import { api } from './services/api';
import type { DashboardSummary, Resource, MissionRequest, DataAlert, MilitaryRole } from './types';


export const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [currentRole, setCurrentRole] = useState<MilitaryRole>('Commander');
  const [isDaylightMode, setIsDaylightMode] = useState<boolean>(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<MissionRequest[]>([]);
  const [alerts, setAlerts] = useState<DataAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [sumRes, resList, reqList, alertList] = await Promise.all([
        api.getDashboardSummary(),
        api.getResources(),
        api.getRequests(),
        api.getAlerts(),
      ]);
      setSummary(sumRes);
      setResources(resList);
      setRequests(reqList);
      setAlerts(alertList);
    } catch (err: any) {
      console.error('Error loading AeroSync data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const pendingReviewCount = summary?.resources_requiring_review || 0;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDaylightMode ? 'bg-slate-100 text-slate-900' : 'bg-navy-950 text-slate-100'
    }`}>
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onRefresh={loadAllData}
        isDaylightMode={isDaylightMode}
        onToggleDaylightMode={() => setIsDaylightMode(!isDaylightMode)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          alertCount={alerts.length}
          pendingReviewCount={pendingReviewCount}
          isDaylightMode={isDaylightMode}
        />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <Routes>
            <Route
              path="/tactical-cop"
              element={<TacticalCOP isDaylightMode={isDaylightMode} currentRole={currentRole} />}
            />
            <Route
              path="/predictive"
              element={<PredictiveAnalytics />}
            />
            <Route
              path="/"
              element={
                <Overview
                  summary={summary}
                  loading={loading}
                  onNavigate={(page) => navigate(page)}
                />
              }
            />
            <Route
              path="/resources"
              element={
                <ResourceReadiness
                  resources={resources}
                  loading={loading}
                  onRefresh={loadAllData}
                />
              }
            />
            <Route
              path="/planning"
              element={
                <PlanningWorkspace
                  requests={requests}
                  resources={resources}
                  loading={loading}
                  onRefresh={loadAllData}
                />
              }
            />
            <Route
              path="/recommendations"
              element={
                <RecommendationReview
                  currentRole={currentRole}
                  onRefresh={loadAllData}
                />
              }
            />
            <Route
              path="/alerts"
              element={
                <AlertsDataQuality
                  alerts={alerts}
                  loading={loading}
                  onRefresh={loadAllData}
                />
              }
            />
            <Route
              path="/audit"
              element={<AuditHistory onRefresh={loadAllData} />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
