import React, { useState, useEffect } from 'react';
import type { Recommendation, PlanningScenario } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RecommendationModal } from '../components/RecommendationModal';
import { api } from '../services/api';
import { Layers, ChevronRight, UserCheck } from 'lucide-react';


interface RecommendationReviewProps {
  currentRole: 'Planner' | 'Reviewer';
  onRefresh: () => void;
}

export const RecommendationReview: React.FC<RecommendationReviewProps> = ({
  currentRole,
  onRefresh
}) => {
  const [scenarios, setScenarios] = useState<PlanningScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeModalRec, setActiveModalRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const scenList = await api.getScenarios();
      setScenarios(scenList);
      if (scenList.length > 0) {
        const firstId = scenList[0].id;
        setSelectedScenarioId(firstId);
        const recs = await api.getScenarioRecommendations(firstId);
        setRecommendations(recs);
      }
    } catch (err: any) {
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScenario = async (scenId: string) => {
    setSelectedScenarioId(scenId);
    try {
      setLoading(true);
      const recs = await api.getScenarioRecommendations(scenId);
      setRecommendations(recs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDecision = async (
    recId: string,
    decision: 'APPROVED' | 'REJECTED',
    comments: string
  ) => {
    await api.reviewRecommendation(recId, {
      reviewer_role: currentRole === 'Reviewer' ? 'Commander (Reviewer)' : 'Mission Planner',
      reviewer_name: currentRole === 'Reviewer' ? 'Commander Vance' : 'Planner Alpha',
      decision,
      comments,
    });
    onRefresh();
    // Reload recommendations for current scenario
    if (selectedScenarioId) {
      const updatedRecs = await api.getScenarioRecommendations(selectedScenarioId);
      setRecommendations(updatedRecs);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Recommendation & Schedule Approval Hub</h2>
          <p className="text-xs text-slate-400">
            Human-in-the-loop governance: review rule explanations, constraint exclusions & authorize schedules
          </p>
        </div>

        {/* Current Active Role Badge */}
        <div className="flex items-center gap-2 bg-navy-950 border border-navy-700 px-3.5 py-2 rounded-xl text-xs">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">Active Decision Role:</span>
          <span className="font-bold text-cyan-300 uppercase">{currentRole}</span>
        </div>
      </div>

      {/* Scenario Selector Tabs */}
      {scenarios.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-navy-800">
          <span className="text-xs text-slate-400 font-mono mr-2">Planning Scenarios:</span>
          {scenarios.map((scen) => (
            <button
              key={scen.id}
              onClick={() => handleSelectScenario(scen.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedScenarioId === scen.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                  : 'bg-navy-900 text-slate-400 hover:text-white border border-navy-700'
              }`}
            >
              {scen.name} ({new Date(scen.created_at).toLocaleDateString()})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400 font-mono">
          Evaluating recommendation alternatives...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="glass-panel p-8 rounded-xl border border-navy-700 text-center space-y-3">
          <Layers className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Scenario Recommendations Generated Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Navigate to the Planning Workspace to create and evaluate candidate scenarios using the rules engine.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`glass-panel p-6 rounded-2xl border transition-all hover:border-navy-600 flex flex-col justify-between space-y-4 ${
                rec.status === 'APPROVED'
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : rec.status === 'REJECTED'
                  ? 'border-rose-500/50 bg-rose-950/10'
                  : 'border-cyan-500/30'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between border-b border-navy-700/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={rec.status} size="sm" />
                      <span className="text-[11px] font-mono text-cyan-400">{rec.id}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{rec.title}</h3>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs text-slate-400 block">Overall Score</span>
                    <span className="text-xl font-bold text-cyan-400">{rec.total_score}</span>
                  </div>
                </div>

                {/* Score Pills */}
                <div className="grid grid-cols-3 gap-2 my-4 text-center">
                  <div className="bg-navy-950 p-2.5 rounded-lg border border-navy-800">
                    <div className="text-[10px] text-slate-400">Coverage</div>
                    <div className="text-sm font-bold text-cyan-400 mt-0.5">{rec.coverage_score}%</div>
                  </div>

                  <div className="bg-navy-950 p-2.5 rounded-lg border border-navy-800">
                    <div className="text-[10px] text-slate-400">Utilization</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{rec.utilization_score}%</div>
                  </div>

                  <div className="bg-navy-950 p-2.5 rounded-lg border border-navy-800">
                    <div className="text-[10px] text-slate-400">Stability</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">{rec.stability_score}%</div>
                  </div>
                </div>

                {/* Rationale Snippet */}
                <div className="bg-navy-950 p-3.5 rounded-xl border border-navy-800 text-xs text-slate-300 font-mono line-clamp-3 leading-relaxed">
                  {rec.explanation_text}
                </div>

                {/* Assignments Count */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>Assigned Missions: <strong className="text-white font-mono">{rec.assignments.length}</strong></span>
                  <span>Rule Exclusions: <strong className="text-rose-400 font-mono">{rec.excluded_resources.length}</strong></span>
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-navy-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  {rec.approvals.length > 0 ? `${rec.approvals.length} Human Review(s)` : 'Awaiting Review'}
                </span>

                <button
                  onClick={() => setActiveModalRec(rec)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <span>Review & Decide</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review & Decision Modal */}
      <RecommendationModal
        recommendation={activeModalRec}
        currentRole={currentRole}
        onClose={() => setActiveModalRec(null)}
        onReview={handleReviewDecision}
      />
    </div>
  );
};
