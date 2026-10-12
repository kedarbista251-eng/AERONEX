import type {
  DashboardSummary, Resource, MissionRequest, DataAlert, AuditEvent,
  PlanningScenario, Recommendation, Approval
} from '../types';


const API_BASE = 'http://localhost:8000/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error ${response.status}: ${errText}`);
  }
  return response.json();
}

export const api = {
  getHealth: () => fetchJson<{ status: string; service: string; timestamp: string }>('/health'),

  getDashboardSummary: () => fetchJson<DashboardSummary>('/dashboard/summary'),

  getResources: (params?: { status?: string; type?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.type) query.append('type', params.type);
    if (params?.search) query.append('search', params.search);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<Resource[]>(`/resources${queryString}`);
  },

  getRequests: (params?: { status?: string; priority?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<MissionRequest[]>(`/requests${queryString}`);
  },

  getAlerts: () => fetchJson<DataAlert[]>('/alerts'),

  getAuditEvents: (search?: string) => {
    const queryString = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchJson<AuditEvent[]>(`/audit${queryString}`);
  },

  importData: () => fetchJson<{ message: string }>('/data/import', { method: 'POST' }),

  createScenario: (data: { name: string; description?: string; request_ids?: string[] }) =>
    fetchJson<PlanningScenario>('/scenarios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getScenarios: () => fetchJson<PlanningScenario[]>('/scenarios'),

  getScenario: (scenarioId: string) => fetchJson<PlanningScenario>(`/scenarios/${scenarioId}`),

  evaluateScenario: (scenarioId: string) =>
    fetchJson<Recommendation[]>(`/scenarios/${scenarioId}/evaluate`, { method: 'POST' }),

  getScenarioRecommendations: (scenarioId: string) =>
    fetchJson<Recommendation[]>(`/scenarios/${scenarioId}/recommendations`),

  reviewRecommendation: (recommendationId: string, review: { reviewer_role: string; reviewer_name: string; decision: 'APPROVED' | 'REJECTED'; comments?: string }) =>
    fetchJson<Approval>(`/recommendations/${recommendationId}/review`, {
      method: 'POST',
      body: JSON.stringify(review),
    }),

  resetDemo: () => fetchJson<{ message: string }>('/reset', { method: 'POST' }),

  // Tactical Operations & Dynamic Retasking (SIH26250)
  getTacticalCOP: (simTime: number = 0.0) =>
    fetchJson<import('../types').TacticalCOPResponse>(`/tactical/cop?sim_time=${simTime}`),

  getThreats: () =>
    fetchJson<import('../types').ThreatZone[]>('/tactical/threats'),

  toggleThreat: (threatId: string) =>
    fetchJson<import('../types').ThreatZone>(`/tactical/threats/${threatId}/toggle`, { method: 'POST' }),

  injectCrisis: (crisisType: string = 'SAM_RADAR_ACTIVATED') =>
    fetchJson<import('../types').RetaskingPlan>(`/tactical/inject-crisis?crisis_type=${encodeURIComponent(crisisType)}`, {
      method: 'POST',
    }),

  commitRetasking: (approved: boolean = true, reviewer: string = 'Commander Alpha') =>
    fetchJson<{ status: string; message: string; aircraft_id?: string; timestamp: string }>(
      `/tactical/retask/commit?approved=${approved}&reviewer=${encodeURIComponent(reviewer)}`,
      { method: 'POST' }
    ),

  getSensorFusion: () =>
    fetchJson<import('../types').FusionResponse>('/tactical/fusion'),

  getMissionATO: (missionId: string) =>
    fetchJson<import('../types').ATOBriefingResponse>(`/tactical/ato/${encodeURIComponent(missionId)}`),
};

