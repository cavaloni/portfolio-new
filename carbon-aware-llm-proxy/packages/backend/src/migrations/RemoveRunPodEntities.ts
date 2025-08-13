import {
  MigrationInterface,
  QueryRunner,
} from "typeorm";

export class RemoveRunPodEntities1700000000003 implements MigrationInterface {
  name = "RemoveRunPodEntities1700000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop RunPod tables if they exist
    await queryRunner.dropTable("runpod_instances", true);
    await queryRunner.dropTable("runpod_deployments", true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration is irreversible - RunPod tables and data will be lost
    // If you need to restore RunPod functionality, you would need to:
    // 1. Restore the RunPod entity files
    // 2. Run the original AddRunPodEntities migration
    // 3. Restore any data from backups
    console.warn("RemoveRunPodEntities migration is irreversible");
  }
}
