import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { RunPodDeployment } from "./RunPodDeployment";

export enum InstanceStatus {
  PENDING = "pending",
  STARTING = "starting",
  RUNNING = "running",
  STOPPING = "stopping",
  STOPPED = "stopped",
  FAILED = "failed",
  TERMINATED = "terminated",
}

@Entity("runpod_instances")
@Index(["deploymentId"])
@Index(["runpodPodId"])
@Index(["status"])
export class RunPodInstance {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "deployment_id" })
  deploymentId!: string;

  @ManyToOne(() => RunPodDeployment, (deployment) => deployment.instances)
  deployment!: RunPodDeployment;

  @Column({ name: "runpod_pod_id", unique: true })
  runpodPodId!: string;

  @Column({
    type: "enum",
    enum: InstanceStatus,
    default: InstanceStatus.PENDING,
  })
  status!: InstanceStatus;

  @Column({ name: "pod_name", nullable: true })
  podName?: string;

  @Column({ name: "machine_id", nullable: true })
  machineId?: string;

  @Column({ name: "gpu_count", default: 1 })
  gpuCount!: number;

  @Column({ name: "vcpu_count", nullable: true })
  vcpuCount?: number;

  @Column({ name: "memory_gb", nullable: true })
  memoryGb?: number;

  @Column({ name: "disk_gb", nullable: true })
  diskGb?: number;

  @Column({ name: "internal_ip", nullable: true })
  internalIp?: string;

  @Column({ name: "external_ip", nullable: true })
  externalIp?: string;

  @Column({ name: "port_mappings", type: "jsonb", nullable: true })
  portMappings?: Record<string, number>;

  @Column({ name: "runtime_seconds", default: 0 })
  runtimeSeconds!: number;

  @Column({
    name: "cost_per_hour",
    type: "decimal",
    precision: 10,
    scale: 4,
    nullable: true,
  })
  costPerHour?: number;

  @Column({
    name: "total_cost",
    type: "decimal",
    precision: 10,
    scale: 4,
    default: 0,
  })
  totalCost!: number;

  @Column({ name: "last_activity", type: "timestamp", nullable: true })
  lastActivity?: Date;

  @Column({ name: "started_at", type: "timestamp", nullable: true })
  startedAt?: Date;

  @Column({ name: "stopped_at", type: "timestamp", nullable: true })
  stoppedAt?: Date;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage?: string;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  // Health check related fields
  @Column({ name: "last_health_check", type: "timestamp", nullable: true })
  lastHealthCheck?: Date;

  @Column({ name: "health_check_failures", default: 0 })
  healthCheckFailures!: number;

  @Column({ name: "consecutive_failures", default: 0 })
  consecutiveFailures!: number;

  // Performance metrics
  @Column({ name: "requests_processed", default: 0 })
  requestsProcessed!: number;

  @Column({ name: "tokens_processed", default: 0 })
  tokensProcessed!: number;

  @Column({
    name: "average_response_time_ms",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  averageResponseTimeMs?: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Computed properties
  get isHealthy(): boolean {
    return (
      this.status === InstanceStatus.RUNNING && this.consecutiveFailures < 3
    );
  }

  get isIdle(): boolean {
    if (!this.lastActivity) return true;
    const idleThreshold = this.deployment?.maxIdleTime || 300; // seconds
    const idleTime = (Date.now() - this.lastActivity.getTime()) / 1000;
    return idleTime > idleThreshold;
  }

  get uptimeHours(): number {
    if (!this.startedAt) return 0;
    const endTime = this.stoppedAt || new Date();
    return (endTime.getTime() - this.startedAt.getTime()) / (1000 * 60 * 60);
  }

  // Calculate current cost based on runtime
  calculateCurrentCost(): number {
    if (!this.costPerHour || !this.startedAt) return 0;

    const runtimeHours = this.uptimeHours;
    return runtimeHours * this.costPerHour;
  }

  // Update activity timestamp
  recordActivity(): void {
    this.lastActivity = new Date();
  }

  // Record successful health check
  recordHealthCheckSuccess(): void {
    this.lastHealthCheck = new Date();
    this.consecutiveFailures = 0;
  }

  // Record failed health check
  recordHealthCheckFailure(): void {
    this.lastHealthCheck = new Date();
    this.healthCheckFailures += 1;
    this.consecutiveFailures += 1;
  }

  // Update performance metrics
  updatePerformanceMetrics(
    responseTimeMs: number,
    tokensProcessed: number,
  ): void {
    this.requestsProcessed += 1;
    this.tokensProcessed += tokensProcessed;

    // Calculate running average of response time
    if (this.averageResponseTimeMs) {
      this.averageResponseTimeMs =
        (this.averageResponseTimeMs * (this.requestsProcessed - 1) +
          responseTimeMs) /
        this.requestsProcessed;
    } else {
      this.averageResponseTimeMs = responseTimeMs;
    }

    this.recordActivity();
  }
}
