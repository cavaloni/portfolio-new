import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("user_preferences")
export class UserPreferences {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne(() => User, (user) => user.preferences, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", nullable: true })
  defaultModelId: string | null = null;

  @Column({ type: "float", default: 0.7 })
  defaultTemperature: number = 0.7;

  @Column({ type: "int", nullable: true })
  defaultMaxTokens: number | null = null;

  @Column({ type: "boolean", default: true })
  carbonAware: boolean = true;

  @Column({ type: "varchar", nullable: true })
  preferredRegion: string | null = null;

  @Column({ type: "boolean", default: true })
  showCarbonImpact: boolean = true;

  @Column({ type: "varchar", default: "system" })
  theme: "light" | "dark" | "system" = "system";

  @Column({ type: "boolean", default: true })
  emailNotifications: boolean = true;

  @Column({ type: "jsonb", nullable: true })
  notificationPreferences: {
    newMessage: boolean;
    carbonThreshold: number | null;
    weeklyReport: boolean;
  } = {
    newMessage: true,
    carbonThreshold: null,
    weeklyReport: true,
  };

  @Column({ type: "jsonb", nullable: true })
  uiPreferences: Record<string, any> = {};

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  updateFromPartial(prefs: Partial<UserPreferences>) {
    Object.assign(this, prefs);
    this.updatedAt = new Date();
  }
}
