import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Message } from "./Message";
import { CarbonFootprint } from "./CarbonFootprint";

@Entity("model_info")
export class ModelInfo {
  @PrimaryColumn("varchar")
  id: string = "";

  @Column({ unique: true })
  providerModelId: string = "";

  @Column()
  name: string = "";

  @Column()
  provider: string = "";

  @Column("text", { nullable: true })
  description: string | null = null;

  @Column("int")
  contextWindow: number = 0;

  @Column("int")
  maxTokens: number = 0;

  @Column("varchar")
  trainingData: string = "";

  @Column("varchar")
  knowledgeCutoff: string = "";

  @Column("varchar")
  architecture: string = "";

  @Column("int")
  parameters: number = 0;

  @Column("float")
  flopsPerToken: number = 0;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  tokensPerSecond: number | null = null;

  @Column("decimal", { precision: 10, scale: 4, nullable: true })
  costPer1kTokens: number | null = null;

  @Column("simple-array")
  capabilities: string[] = [];

  @Column("jsonb")
  carbonIntensity: {
    min: number;
    max: number;
    avg: number;
    unit: string;
  } = { min: 0, max: 0, avg: 0, unit: "gCO2e/kWh" };

  @Column("jsonb")
  latency: {
    min: number;
    max: number;
    avg: number;
    unit: string;
  } = { min: 0, max: 0, avg: 0, unit: "ms" };

  @Column({ default: false })
  isRecommended: boolean = false;

  @Column({ default: false })
  isCarbonAware: boolean = false;

  @Column({ default: true })
  isActive: boolean = true;

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any> = {};

  @Column({ type: "timestamp", nullable: true })
  lastUpdated: Date | null = null;

  @Column({ type: "timestamp", nullable: true })
  publishedDate: Date | null = null;

  @OneToMany(() => Message, (message) => message.modelId)
  messages!: Message[];

  @OneToMany(() => CarbonFootprint, (carbonFootprint) => carbonFootprint.model)
  carbonFootprints!: CarbonFootprint[];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();

  // Add tokensPerSecond getter with default value
  getTokensPerSecond(): number {
    return this.tokensPerSecond || 10; // Default to 10 tokens/second if not specified
  }

  // Add costPer1kTokens getter with default value
  getCostPer1kTokens(): number {
    return this.costPer1kTokens || 0.01; // Default to $0.01/1k tokens if not specified
  }

  // Helper methods
  getCarbonIntensityForRegion(region?: string): number {
    // In a real implementation, this would return different values based on region
    return this.carbonIntensity.avg;
  }

  getLatencyForRegion(region?: string): number {
    // In a real implementation, this would return different values based on region
    return this.latency.avg;
  }
}
