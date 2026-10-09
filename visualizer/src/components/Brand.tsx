import { ShieldCheck } from "lucide-react";

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><ShieldCheck size={19} strokeWidth={2.2} /></span>
      <span className="brand-name">octa-core<span>.</span></span>
      <span className="brand-subtitle">MINER VISUALIZER</span>
    </div>
  );
}
