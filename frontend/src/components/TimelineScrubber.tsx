import React, { useEffect, useRef } from 'react';
import { Play, Pause, Clock, RotateCcw } from 'lucide-react';

interface TimelineScrubberProps {
  simTime: number; // in hours (0.0 to 4.0)
  onSimTimeChange: (newTime: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  isDaylightMode?: boolean;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  simTime,
  onSimTimeChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  isDaylightMode = false,
}) => {
  const simTimeRef = useRef(simTime);
  simTimeRef.current = simTime;

  // Animation loop when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const next = simTimeRef.current + 0.02 * playbackSpeed;
      onSimTimeChange(next > 4.0 ? 0.0 : Number(next.toFixed(2)));
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, onSimTimeChange]);

  const hours = Math.floor(simTime);
  const minutes = Math.floor((simTime - hours) * 60);
  const timeFormatted = `T+${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ZULU`;

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-md shadow-lg transition-colors ${
      isDaylightMode
        ? 'bg-white/90 border-slate-300 text-slate-800'
        : 'bg-navy-900/90 border-cyan-900/40 text-slate-100'
    }`}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Play 4D Flight Simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Reset Time Button */}
          <button
            onClick={() => onSimTimeChange(0.0)}
            className={`p-2 rounded-lg border transition-colors ${
              isDaylightMode
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:text-cyan-600'
                : 'bg-navy-950 border-slate-700 text-slate-300 hover:text-cyan-400'
            }`}
            title="Reset to Present Zulu Time (T+00)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Selector */}
          <div className={`flex items-center border rounded-lg p-1 text-xs font-mono ${
            isDaylightMode ? 'bg-slate-100 border-slate-300' : 'bg-navy-950 border-slate-700'
          }`}>
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => onChangeSpeed(speed)}
                className={`px-2 py-1 rounded transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : isDaylightMode
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Current Sim Zulu Timestamp */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs ${
            isDaylightMode ? 'bg-slate-100 border-slate-300' : 'bg-navy-950 border-slate-800'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isDaylightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
            <span className={`font-bold ${isDaylightMode ? 'text-cyan-700' : 'text-cyan-300'}`}>{timeFormatted}</span>
          </div>
        </div>

        {/* 4D Timeline Slider */}
        <div className="flex-1 w-full max-w-xl flex items-center gap-3">
          <span className={`text-[11px] font-mono ${isDaylightMode ? 'text-slate-500' : 'text-slate-400'}`}>T+00:00</span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min="0"
              max="4.0"
              step="0.05"
              value={simTime}
              onChange={(e) => onSimTimeChange(parseFloat(e.target.value))}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 border ${
                isDaylightMode ? 'bg-slate-200 border-slate-300' : 'bg-navy-950 border-slate-800'
              }`}
            />
          </div>
          <span className={`text-[11px] font-mono ${isDaylightMode ? 'text-slate-500' : 'text-slate-400'}`}>T+04:00</span>
        </div>

        {/* Tactical Air Traffic Projection Tag */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>4D AIRSPACE INTERPOLATION ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
