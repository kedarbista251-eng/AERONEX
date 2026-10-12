import React, { useState } from 'react';
import type { MissionRequest, Resource } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { GanttChart } from '../components/GanttChart';
import { api } from '../services/api';
import { Play, AlertTriangle, Layers, MapPin, Gauge } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

interface PlanningWorkspaceProps {
  requests: MissionRequest[];
  resources: Resource[];
  loading?: boolean;
  onRefresh: () => void;
}

export const PlanningWorkspace: React.FC<PlanningWorkspaceProps> = ({
  requests,
  resources,
  onRefresh
}) => {

  const navigate = useNavigate();
  const [scenarioName, setScenarioName] = useState('Evacuation & Transport Scenario Alpha');
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const toggleSelectRequest = (id: string) => {
    if (selectedReqIds.includes(id)) {
      setSelectedReqIds(selectedReqIds.filter((rId) => rId !== id));
    } else {
      setSelectedReqIds([...selectedReqIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedReqIds.length === requests.length) {
      setSelectedReqIds([]);
    } else {
      setSelectedReqIds(requests.map((r) => r.id));
    }
  };

  const handleEvaluateScenario = async () => {
    try {
      setIsEvaluating(true);
      // 1. Create scenario
      const scenario = await api.createScenario({
        name: scenarioName || 'Custom Operational Scenario',
        description: `Evaluating ${selectedReqIds.length || requests.length} mission requests`,
        request_ids: selectedReqIds.length > 0 ? selectedReqIds : undefined,
      });

      // 2. Evaluate scenario
      await api.evaluateScenario(scenario.id);

      onRefresh();
      // 3. Navigate to Recommendation Review page
      navigate('/recommendations');
    } catch (err: any) {
      alert('Error evaluating scenario: ' + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Scenario Control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Mission Planning & Scheduling Workspace</h2>
          <p className="text-xs text-slate-400">
            Synthesize abstract mission requests, generate feasible schedule alternatives & evaluate hard constraints
          </p>
        </div>

        {/* Evaluate Scenario Control */}
        <div className="glass-panel p-3 rounded-xl border border-cyan-500/40 flex items-center gap-3 self-start lg:self-auto">
          <input
            type="text"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            placeholder="Scenario Title..."
            className="bg-navy-950 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64"
          />

          <button
            onClick={handleEvaluateScenario}
            disabled={isEvaluating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>{isEvaluating ? 'Evaluating Constraints...' : 'Evaluate Feasible Scenario'}</span>
          </button>
        </div>
      </div>

      {/* Gantt Timeline Component */}
      <GanttChart resources={resources} requests={requests} assignments={[]} />

      {/* Mission Request Roster */}
      <div className="glass-panel p-5 rounded-xl border border-navy-700/60 space-y-4">
        <div className="flex items-center justify-between border-b border-navy-700/60 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Candidate Mission Planning Requests ({requests.length})</h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-mono underline"
            >
              {selectedReqIds.length === requests.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Selected: {selectedReqIds.length || requests.length} requests
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => {
            const isSelected = selectedReqIds.includes(req.id);
            const isInfeasible = req.id === 'REQ-2026-011'; // Demo infeasible request


            return (
              <div
                key={req.id}
                onClick={() => toggleSelectRequest(req.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-navy-850/90 border-cyan-500/80 shadow-md shadow-cyan-500/10'
                    : 'bg-navy-950/60 border-navy-800 hover:border-navy-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={req.priority} size="sm" />
                    <span className="text-[11px] font-mono text-cyan-400">{req.id}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded border-navy-700 bg-navy-900 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                </div>

                <h4 className="text-sm font-bold text-white mb-1 leading-snug">{req.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{req.description}</p>

                <div className="space-y-1.5 text-[11px] font-mono text-slate-300 bg-navy-900/80 p-2.5 rounded-lg border border-navy-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>Route:</span>
                    </span>
                    <span className="font-semibold text-white">{req.origin_location} ➔ {req.destination_location}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-cyan-400" />
                      <span>Payload / Dist:</span>
                    </span>
                    <span className="text-cyan-300 font-bold">{req.payload_weight_kg.toLocaleString()}kg / {req.distance_km}km</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-navy-900">
                    <span className="text-slate-400">Demanded Type:</span>
                    <span className="text-white font-bold">{req.required_resource_type.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                {/* Capability & Store Requirements */}
                {req.required_capabilities && req.required_capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {req.required_capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}

                {isInfeasible && (
                  <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/60 p-1.5 rounded border border-rose-800 flex items-center gap-1 font-mono">
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>Payload exceeds all available fleet limits (Engine test)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
