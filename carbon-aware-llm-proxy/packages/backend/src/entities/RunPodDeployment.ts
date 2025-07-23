import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from "typeorm";
import { ModelInfo } from "./ModelInfo";
import { RunPodInstance } from "./RunPodInstance";

export enum DeploymentStatus {
  PENDING = "pending",
  DEPLOYING = "deploying",
  RUNNING = "running",
  SCALING = "scaling",
  STOPPING = "stopping",
  STOPPED = "stopped",
  FAILED = "failed",
}

@Entity("runpod_deployments")
@Index(["modelId", "region"])
@Index(["status"])
export class RunPodDeployment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "model_id" })
  modelId!: string;

  @ManyToOne(() => ModelInfo, { eager: true })
  model!: ModelInfo;

  @Column({ length: 50 })
  region!: string;

  @Column({ name: "gpu_type", length: 100 })
  gpuType!: string;

  @Column({
    type: "enum",
    enum: DeploymentStatus,
    default: DeploymentStatus.PENDING,
  })
  status!: DeploymentStatus;

  @Column({ name: "min_replicas", default: 1 })
  minReplicas!: number;

  @Column({ name: "max_replicas", default: 3 })
  maxReplicas!: number;

  @Column({ name: "current_replicas", default: 0 })
  currentReplicas!: number;

  @Column({ name: "auto_scaling", default: true })
  autoScaling!: boolean;

  @Column({ name: "max_idle_time", default: 300 })
  maxIdleTime!: number;

  @Column({ name: "container_disk_size", default: 50 })
  containerDiskSize!: number;

  @Column({ name: "volume_size", default: 100 })
  volumeSize!: number;

  @Column({ name: "endpoint_url", nullable: true })
  endpointUrl?: string;

  @Column({ name: "runpod_endpoint_id", nullable: true })
  runpodEndpointId?: string;

  @Column({ type: "jsonb", nullable: true })
  configuration?: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: "last_health_check", type: "timestamp", nullable: true })
  lastHealthCheck?: Date;

  @Column({ name: "health_status", default: "unknown" })
  healthStatus!: "healthy" | "unhealthy" | "unknown";

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage?: string;

  @Column({
    name: "deployment_cost_per_hour",
    type: "decimal",
    precision: 10,
    scale: 4,
    nullable: true,
  })
  deploymentCostPerHour?: number;

  @Column({
    name: "carbon_intensity",
    type: "decimal",
    precision: 10,
    scale: 6,
    nullable: true,
  })
  carbonIntensity?: number; // kg CO2e/kWh for the region

  @OneToMany(() => RunPodInstance, (instance) => instance.deployment, {
    cascade: true,
  })
  instances!: RunPodInstance[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Computed properties
  get isHealthy(): boolean {
    return (
      this.healthStatus === "healthy" &&
      this.status === DeploymentStatus.RUNNING
    );
  }

  get isScalable(): boolean {
    return this.autoScaling && this.status === DeploymentStatus.RUNNING;
  }

  get canScale(): boolean {
    return this.isScalable && this.currentReplicas < this.maxReplicas;
  }

  get shouldScaleDown(): boolean {
    return this.isScalable && this.currentReplicas > this.minReplicas;
  }

  // Calculate estimated carbon footprint per hour
  calculateCarbonFootprint(powerConsumptionWatts: number): number {
    if (!this.carbonIntensity) return 0;

    // Convert watts to kWh and multiply by carbon intensity
    const powerConsumptionKWh =
      (powerConsumptionWatts * this.currentReplicas) / 1000;
    return powerConsumptionKWh * this.carbonIntensity;
  }

  // Calculate total cost per hour including all replicas
  calculateTotalCostPerHour(): number {
    if (!this.deploymentCostPerHour) return 0;
    return this.deploymentCostPerHour * this.currentReplicas;
  }
}
