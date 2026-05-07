import { Cpu, HardDrive, Thermometer, ArrowDownToLine, ArrowUpFromLine, Timer, CircuitBoard } from 'lucide-react';
import type { HardwareMetrics } from '../types';

interface HardwareStatusProps {
  metrics: HardwareMetrics;
}

function MetricGauge({ label, value, max, unit, icon: Icon, color }: {
  label: string;
  value: number;
  max: number;
  unit: string;
  icon: typeof Cpu;
  color: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  const resolveColor = (c: string) =>
    c === 'guardian-accent' ? '#00ff9d' :
    c === 'blue-400' ? '#60a5fa' :
    c === 'cyan-400' ? '#22d3ee' :
    '#00ff9d';

  const bgColor =
    percentage >= 80 ? '#ef4444' :
    percentage >= 60 ? '#eab308' :
    resolveColor(color);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-secondary">
          <Icon className="w-3 h-3" />
          <span>{label}</span>
        </div>
        <span className="text-xs font-mono text-primary">{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-guardian-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: bgColor,
          }}
        />
      </div>
    </div>
  );
}

export default function HardwareStatus({ metrics }: HardwareStatusProps) {
  return (
    <div className="card">
      <div className="card-header">
        <CircuitBoard className="w-4 h-4 text-guardian-accent" />
        Hardware Status
        <span className="ml-auto text-[10px] text-muted">Raspberry Pi 4B</span>
      </div>

      <div className="space-y-3">
        <MetricGauge label="CPU" value={metrics.cpuUsage} max={100} unit="%" icon={Cpu} color="guardian-accent" />
        <MetricGauge label="Memory" value={metrics.memoryUsage} max={100} unit="%" icon={HardDrive} color="blue-400" />
        <MetricGauge label="Temperature" value={metrics.temperature} max={85} unit="°C" icon={Thermometer} color="cyan-400" />
        <MetricGauge label="Disk" value={metrics.diskUsage} max={100} unit="%" icon={HardDrive} color="guardian-accent" />
      </div>

      {/* Network I/O */}
      <div className="mt-3 pt-3 border-t border-guardian-border grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-xs">
          <ArrowDownToLine className="w-3 h-3 text-guardian-accent" />
          <span className="text-secondary">In</span>
          <span className="ml-auto font-mono text-primary">{metrics.networkIn} MB/s</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <ArrowUpFromLine className="w-3 h-3 text-blue-400" />
          <span className="text-secondary">Out</span>
          <span className="ml-auto font-mono text-primary">{metrics.networkOut} MB/s</span>
        </div>
      </div>

      {/* ML Status */}
      <div className="mt-3 pt-3 border-t border-guardian-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${metrics.modelLoaded ? 'bg-guardian-accent' : 'bg-red-500'}`} />
          <span className="text-secondary">ML Model</span>
          <span className={metrics.modelLoaded ? 'text-guardian-accent' : 'text-red-400'}>
            {metrics.modelLoaded ? 'Loaded' : 'Not Loaded'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-secondary">
          <Timer className="w-3 h-3" />
          <span className="font-mono">{metrics.inferenceTime}ms</span>
        </div>
      </div>
    </div>
  );
}
