import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { Conversation } from "./Conversation";
import { CarbonFootprint } from "./CarbonFootprint";

export enum MessageRole {
  SYSTEM = "system",
  USER = "user",
  ASSISTANT = "assistant",
  FUNCTION = "function",
}

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "conversationId" })
  conversation!: Conversation;

  @Column({ type: "uuid" })
  conversationId!: string;

  @Column({ type: "enum", enum: MessageRole })
  role!: MessageRole;

  @Column("text")
  content!: string;

  @Column({ type: "varchar", nullable: true })
  modelId: string | null = null;

  @Column({ type: "int", nullable: true })
  tokens: number | null = null;

  @Column({ type: "boolean", default: false })
  isStreaming: boolean = false;

  @Column({ type: "boolean", default: false })
  isComplete: boolean = false;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> = {};

  @OneToOne(() => CarbonFootprint, (footprint) => footprint.message, {
    cascade: true,
    nullable: true,
  })
  carbonFootprint?: CarbonFootprint | null;

  @Column({ type: "uuid", nullable: true })
  parentMessageId: string | null = null;

  @CreateDateColumn()
  createdAt!: Date;

  // Helper methods
  toJSON() {
    const { conversation, conversationId, ...rest } = this;
    return rest;
  }
}
