import { Wifi, WifiOff } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function NetworkSyncBar() {
  const { networkStatus } = useAppStore();

  return (
    <div className="network-sync-bar">
      <div className="row">
        <span className={`chip ${networkStatus === "ONLINE" ? "chip-success" : "chip-warning"}`}>
          {networkStatus === "ONLINE" ? <Wifi size={12} /> : <WifiOff size={12} />}
          Network: {networkStatus}
        </span>
      </div>
    </div>
  );
}
