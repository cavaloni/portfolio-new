import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { Message } from "./Message";
import { ModelInfo } from "./ModelInfo";

@Entity("carbon_footprints")
export class CarbonFootprint {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne(() => Message, (message) => message.carbonFootprint, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn()
  message!: Message;

  @Column({ type: "uuid" })
  messageId!: string;

  @Column("decimal", { precision: 10, scale: 6 })
  emissions!: number; // in grams CO2e

  @Column("decimal", { precision: 10, scale: 6 })
  energy!: number; // in kWh

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  intensity: number | null = null; // gCO2e/kWh

  @Column({ type: "varchar", nullable: true })
  region: string | null = null;

  @Column("varchar", { nullable: true })
  modelName: string | null = null;

  @Column("varchar", { nullable: true })
  provider: string | null = null;

  @Column("decimal", { precision: 10, scale: 6 })
  carbonIntensityMin!: number;

  @Column("decimal", { precision: 10, scale: 6 })
  carbonIntensityAvg!: number;

  @Column("decimal", { precision: 10, scale: 6 })
  carbonIntensityMax!: number;

  @Column("varchar", { nullable: true })
  source: string | null = null;

  @Column("varchar", { nullable: true })
  hardware: string | null = null;

  @ManyToOne(() => ModelInfo, (model) => model.carbonFootprints, {
    nullable: true,
  })
  model: ModelInfo | null = null;

  @Column({ type: "uuid", nullable: true })
  modelId: string | null = null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any> = {};

  // Helper methods
  toGrams(): number {
    return this.emissions;
  }

  toKilograms(): number {
    return this.emissions / 1000;
  }

  toTons(): number {
    return this.emissions / 1_000_000;
  }
}
