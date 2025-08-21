import { MigrationInterface, QueryRunner } from "typeorm";

export class DropNovitaEntities1700000000004 implements MigrationInterface {
  name = "DropNovitaEntities1700000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key if exists
    try {
      const table = await queryRunner.getTable("novita_instances");
      const fk = table?.foreignKeys.find((fk) =>
        fk.columnNames.includes("deployment_id"),
      );
      if (fk) {
        await queryRunner.dropForeignKey("novita_instances", fk);
      }
    } catch {}

    // Drop indexes defensively
    const dropIndexIfExists = async (table: string, index: string) => {
      try {
        await queryRunner.dropIndex(table, index);
      } catch {}
    };

    await dropIndexIfExists("novita_instances", "IDX_novita_instances_status");
    await dropIndexIfExists(
      "novita_instances",
      "IDX_novita_instances_novita_instance_id",
    );
    await dropIndexIfExists(
      "novita_instances",
      "IDX_novita_instances_deployment_id",
    );
    await dropIndexIfExists(
      "novita_deployments",
      "IDX_novita_deployments_health_status",
    );
    await dropIndexIfExists(
      "novita_deployments",
      "IDX_novita_deployments_deployment_type",
    );
    await dropIndexIfExists(
      "novita_deployments",
      "IDX_novita_deployments_status",
    );
    await dropIndexIfExists(
      "novita_deployments",
      "IDX_novita_deployments_model_id_region",
    );

    // Drop tables if they exist
    await queryRunner.dropTable("novita_instances", true);
    await queryRunner.dropTable("novita_deployments", true);
  }

  public async down(): Promise<void> {
    // Irreversible in this migration
  }
}
