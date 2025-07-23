import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Conversation } from "./Conversation";
import { UserPreferences } from "./UserPreferences";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  passwordHash!: string;

  @Column({ type: "varchar", nullable: true })
  name: string | null = null;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ type: "varchar", nullable: true })
  avatarUrl: string | null = null;

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations!: Conversation[];

  @OneToMany(() => UserPreferences, (prefs) => prefs.user)
  preferences!: UserPreferences;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // For password reset and email verification
  @Column({ type: "varchar", nullable: true, select: false })
  resetPasswordToken: string | null = null;

  @Column({ type: "timestamp", nullable: true })
  resetPasswordExpires: Date | null = null;

  @Column({ type: "varchar", nullable: true, select: false })
  emailVerificationToken: string | null = null;

  @Column({ type: "timestamp", nullable: true })
  emailVerificationExpires: Date | null = null;

  // OAuth fields
  @Column({ type: "varchar", nullable: true })
  oauthProvider: string | null = null;

  @Column({ type: "varchar", nullable: true })
  oauthId: string | null = null;

  @Column({ type: "jsonb", nullable: true })
  oauthProfile: Record<string, any> | null = null;

  // Methods
  toJSON() {
    const { passwordHash, ...rest } = this;
    return rest;
  }
}
