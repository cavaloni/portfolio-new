import { apiPost } from "@/lib/api-client";

export interface PresenceRequest {
  region?: string;
}

export interface PresenceResponse {
  success: boolean;
  message: string;
  deployments: Array<{
    appName: string;
    modelId: string;
    region: string | null;
  }>;
}

class PresenceService {
  private intervalId: NodeJS.Timeout | null = null;
  private isActive = false;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly JITTER_RANGE = 5000; // ±5 seconds

  start(region?: string) {
    if (this.isActive) return;

    this.isActive = true;
    this.scheduleNext(region);

    // Pause when page is hidden
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  stop() {
    this.isActive = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }

  private handleVisibilityChange = () => {
    if (document.hidden) {
      // Pause when tab is hidden
      if (this.intervalId) {
        clearTimeout(this.intervalId);
        this.intervalId = null;
      }
    } else if (this.isActive) {
      // Resume when tab becomes visible
      this.scheduleNext();
    }
  };

  private scheduleNext(region?: string) {
    if (!this.isActive || document.hidden) return;

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.JITTER_RANGE - this.JITTER_RANGE / 2;
    const delay = this.HEARTBEAT_INTERVAL + jitter;

    this.intervalId = setTimeout(() => {
      this.sendHeartbeat(region);
      this.scheduleNext(region);
    }, delay);
  }

  private async sendHeartbeat(region?: string) {
    try {
      const response = await apiPost<PresenceResponse>(
        "/v1/presence",
        { region },
      );

      if (response.error) {
        console.warn("Presence heartbeat failed:", response.error.message);
      }
    } catch (error) {
      // Silently fail - presence is best effort
      console.debug("Presence heartbeat error:", error);
    }
  }

  // Manual heartbeat for testing
  async sendManualHeartbeat(region?: string): Promise<PresenceResponse | null> {
    try {
      const response = await apiPost<PresenceResponse>(
        "/v1/presence",
        { region },
      );

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data || null;
    } catch (error) {
      console.error("Manual presence heartbeat error:", error);
      return null;
    }
  }
}

export const presenceService = new PresenceService();
