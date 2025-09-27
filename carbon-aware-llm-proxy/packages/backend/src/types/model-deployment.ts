export interface ModelDeployment {
  id: string;
  modelId: string;
  appName: string;
  functionName: string | null;
  region: string | null;
  gpuClass: string | null;
  alwaysWarm: boolean;
  warmDepth: string | null;
  scaledownWindowSec: number;
  status: string;
  ingressUrl: string | null;
  preference: string | null;
  scoreCost: number;
  scoreSpeed: number;
  scoreQuality: number;
  scoreGreen: number;
  secret: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
