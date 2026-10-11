import React from 'react';
import type { Resource, MissionRequest, ScheduleAssignment } from '../types';

import { Clock, AlertTriangle } from 'lucide-react';

interface GanttChartProps {
  resources: Resource[];
  requests: MissionRequest[];
  assignments: ScheduleAssignment[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ resources, requests, assignments }) => {
  // Generate 24 hourly ticks (00:00 to 23:00)
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  return (
    <div className="glass-panel p-5 rounded-xl border border-navy-700/60 space-y-4">
      <div className="flex items-center justify-between border-b border-navy-700/60 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">24-Hour Air Fleet Operations Schedule Timeline</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500/80"></span>
            <span className="text-slate-300">Scheduled Flight</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/80"></span>
            <span className="text-slate-300">Maintenance Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/80"></span>
            <span className="text-slate-300">Schedule Conflict</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header Row with Hours */}
          <div className="grid grid-cols-[200px_1fr] border-b border-navy-700 text-xs font-mono text-slate-400 py-2">
            <div className="font-semibold text-slate-300 px-3">Resource Identifier</div>
            <div className="grid grid-cols-24 gap-0 text-center">
              {hours.map((h, i) => (
                <div key={i} className="border-l border-navy-800 text-[10px]">
                  {i % 3 === 0 ? h : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Resource Timeline Rows */}
          <div className="divide-y divide-navy-800/60">
            {resources.slice(0, 10).map((res) => {
              // Find assignments for this resource
              const resAssigns = assignments.filter((a) => a.resource_id === res.id);
              const isMaint = res.status === 'MAINTENANCE';

              return (
                <div key={res.id} className="grid grid-cols-[200px_1fr] items-center py-2.5 hover:bg-navy-850/50">
                  <div className="px-3">
                    <div className="text-xs font-bold text-white truncate">{res.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>{res.id}</span>
                      <span>•</span>
                      <span className="text-cyan-400">{res.location_base}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-24 gap-0 relative h-7 bg-navy-950/80 rounded border border-navy-800/80 items-center">
                    {/* Simulated Timeline Bars */}
                    {isMaint && (
                      <div
                        className="absolute top-1 bottom-1 bg-amber-500/30 border border-amber-500/60 rounded px-2 text-[10px] text-amber-200 flex items-center justify-between font-mono"
                        style={{ left: '15%', width: '35%' }}
                      >
                        <span className="truncate">Emergency Maintenance</span>
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      </div>
                    )}

                    {resAssigns.map((assign, idx) => {
                      const req = requests.find((r) => r.id === assign.request_id);
                      const leftPct = (idx * 25 + 10) % 70;
                      return (
                        <div
                          key={assign.id}
                          className="absolute top-1 bottom-1 bg-cyan-500/40 border border-cyan-400/80 rounded px-2 text-[10px] text-cyan-100 flex items-center justify-between font-mono hover:bg-cyan-500/60 cursor-pointer transition-colors"
                          style={{ left: `${leftPct}%`, width: '28%' }}
                          title={`${req?.title || 'Mission'} (${assign.assigned_start})`}
                        >
                          <span className="truncate font-semibold">{req?.title || assign.request_id}</span>
                        </div>
                      );
                    })}

                    {!isMaint && resAssigns.length === 0 && (
                      <div className="col-span-24 text-center text-[10px] text-slate-500 italic">
                        Available for Dispatch
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
