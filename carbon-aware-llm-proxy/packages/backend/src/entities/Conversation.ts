import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Message } from "./Message";

export enum ConversationStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
  DELETED = "deleted",
}

@Entity("conversations")
export class Conversation {
  constructor(userId: string, user: User) {
    this.userId = userId;
    this.user = user;
    this.status = ConversationStatus.ACTIVE;
    this.carbonAware = true;
    this.messageCount = 0;
    this.totalTokens = 0;
    this.totalEmissions = 0;
    this.totalEnergy = 0;
  }
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", nullable: true })
  title: string | null = null;

  @ManyToOne(() => User, (user) => user.conversations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({
    type: "enum",
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> | null = null;

  @Column({ type: "varchar", nullable: true })
  modelId: string | null = null;

  @Column({ type: "float", nullable: true })
  temperature: number | null = null;

  @Column({ type: "int", nullable: true })
  maxTokens: number | null = null;

  @Column({ type: "boolean", default: true })
  carbonAware: boolean;

  @Column({ type: "int", default: 0 })
  messageCount: number;

  @Column({ type: "int", default: 0 })
  totalTokens: number;

  @Column({ type: "float", default: 0 })
  totalEmissions: number; // in grams CO2e

  @Column({ type: "float", default: 0 })
  totalEnergy: number; // in kWh

  @OneToMany(() => Message, (message) => message.conversation)
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper method to update stats when a new message is added
  updateStats(message: Message) {
    this.messageCount += 1;
    this.totalTokens += message.tokens || 0;

    if (message.carbonFootprint) {
      this.totalEmissions += message.carbonFootprint.emissions || 0;
      this.totalEnergy += message.carbonFootprint.energy || 0;
    }

    // Auto-generate a title if this is the first message
    if (this.messageCount === 1 && message.role === "user") {
      this.title = message.content.slice(0, 100);
    }

    this.updatedAt = new Date();
  }
}
