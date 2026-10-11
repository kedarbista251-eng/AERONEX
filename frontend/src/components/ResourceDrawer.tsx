import React from 'react';
import type { Resource } from '../types';
import { X, ShieldCheck, MapPin, Gauge, Wind, Eye, Calendar } from 'lucide-react';

import { StatusBadge } from './StatusBadge';

interface ResourceDrawerProps {
  resource: Resource | null;
  onClose: () => void;
}

export const ResourceDrawer: React.FC<ResourceDrawerProps> = ({ resource, onClose }) => {
  if (!resource) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-navy-900 border-l border-navy-700 h-full p-6 overflow-y-auto flex flex-col justify-between shadow-2xl">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-navy-700/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={resource.status} size="sm" />
                <span className="text-xs font-mono text-cyan-400">{resource.id}</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{resource.name}</h2>
              <p className="text-xs text-slate-400">{resource.resource_type.replace(/_/g, ' ')}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-navy-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Health Score & Location */}
          <div className="grid grid-cols-2 gap-3 my-5">
            <div className="bg-navy-950 p-3.5 rounded-xl border border-navy-800">
              <div className="text-xs text-slate-400">Health Index</div>
              <div className="text-2xl font-bold text-emerald-400 mt-0.5">{resource.health_score}%</div>
              <div className="w-full bg-navy-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${resource.health_score}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-navy-950 p-3.5 rounded-xl border border-navy-800 flex flex-col justify-between">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Base Location</span>
              </div>
              <div className="text-base font-bold text-white mt-1">{resource.location_base}</div>
              <div className="text-[10px] text-slate-500 font-mono">Source: {resource.source}</div>
            </div>
          </div>

          {/* Operating Specifications */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Technical Operating Limits
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
                <div className="text-slate-400 flex items-center gap-1 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Payload Capacity</span>
                </div>
                <div className="font-bold text-white text-sm">
                  {resource.payload_capacity_kg.toLocaleString()} kg
                </div>
              </div>

              <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
                <div className="text-slate-400 flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Flight Range</span>
                </div>
                <div className="font-bold text-white text-sm">
                  {resource.range_km.toLocaleString()} km
                </div>
              </div>

              <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
                <div className="text-slate-400 flex items-center gap-1 mb-1">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Max Wind Limit</span>
                </div>
                <div className="font-bold text-white text-sm">{resource.max_wind_resistance_kts} kts</div>
              </div>

              <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
                <div className="text-slate-400 flex items-center gap-1 mb-1">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Min Visibility</span>
                </div>
                <div className="font-bold text-white text-sm">{resource.min_visibility_km} km</div>
              </div>
            </div>
          </div>

          {/* Capabilities Tags */}
          <div className="mt-5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Certified Capabilities
            </h3>
            <div className="flex flex-wrap gap-2">
              {resource.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/80"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-navy-800 text-xs text-slate-500 flex items-center justify-between font-mono">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Updated: {new Date(resource.last_updated).toLocaleString()}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-navy-800 text-slate-200 rounded-lg font-semibold hover:bg-navy-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
