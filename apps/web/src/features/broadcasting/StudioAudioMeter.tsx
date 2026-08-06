import { StatusBadge } from '../../design-system/components';
import {
  microphoneSignalPresentation,
  type MicrophoneSignalState,
} from './studio-diagnostics';
import './studio-audio-meter.css';

export function StudioAudioMeter({
  decibels,
  label,
  level,
  state,
  segments = 24,
}: {
  decibels: number;
  label: string;
  level: number;
  state: MicrophoneSignalState;
  segments?: number;
}) {
  const presentation = microphoneSignalPresentation[state];
  const normalizedLevel = Math.min(1, Math.max(0, level));
  const activeSegments = Math.round(normalizedLevel * segments);
  const percentage = Math.round(normalizedLevel * 100);
  const finiteDecibels = Number.isFinite(decibels);
  const silent = state === 'no-signal' || state === 'disconnected';
  const statusLabel = state === 'clipping' ? 'Recent clipping' : presentation.label;

  return (
    <div className={`studio-signal-meter studio-signal-${state}`}>
      <div className="studio-signal-meter-header">
        <strong>{label}</strong>
        <StatusBadge tone={presentation.tone}>{statusLabel}</StatusBadge>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        aria-valuetext={`${statusLabel}. ${presentation.guidance}`}
        className="studio-signal-meter-bars"
        role="meter"
        style={{ gridTemplateColumns: `repeat(${segments}, minmax(3px, 1fr))` }}
      >
        {Array.from({ length: segments }, (_, index) => {
          const active = index < activeSegments && !silent;
          const hot = active && index >= Math.floor(segments * 0.84);
          return <i className={hot ? 'is-hot' : active ? 'is-active' : ''} key={index} />;
        })}
      </div>
      <div className="studio-signal-meter-readout">
        <span>Current level</span>
        <span>{finiteDecibels ? `${decibels.toFixed(1)} dBFS` : 'No reading'}</span>
      </div>
      <p>{presentation.guidance}</p>
    </div>
  );
}
