import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("model_deployments")
export class ModelDeployment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  modelId!: string; // FK to ModelInfo.id

  @Column({ type: "varchar", unique: true })
  appName!: string;

  @Column({ type: "varchar" })
  functionName!: string;

  @Column({ type: "varchar", nullable: true })
  region!: string | null; // null => region-agnostic

  @Column({ type: "varchar" })
  gpuClass!: string;

  @Column({ type: "boolean", default: false })
  alwaysWarm!: boolean; // presence-based warming trigger

  @Column({ type: "varchar", default: "light" })
  warmDepth!: "none" | "light" | "deep";

  @Column({ type: "int", default: 180 })
  scaledownWindowSec!: number;

  @Column({ type: "varchar", default: "pending" })
  status!: "pending" | "deployed" | "error";

  @Column({ type: "varchar", nullable: true })
  ingressUrl!: string | null;

  @Column({ type: "varchar", nullable: true })
  preference!: "cost" | "speed" | "quality" | "green" | null;

  @Column({ type: "smallint", default: 0 })
  scoreCost!: number;

  @Column({ type: "smallint", default: 0 })
  scoreSpeed!: number;

  @Column({ type: "smallint", default: 0 })
  scoreQuality!: number;

  @Column({ type: "smallint", default: 0 })
  scoreGreen!: number;

  @Column({ type: "varchar" })
  secret!: string; // HMAC secret for signing requests

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
