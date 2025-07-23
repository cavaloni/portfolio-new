import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from "typeorm";

export class AddRunPodEntities1700000000001 implements MigrationInterface {
  name = "AddRunPodEntities1700000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop tables if they exist (in case of previous failed migration)
    await queryRunner.dropTable("runpod_instances", true);
    await queryRunner.dropTable("runpod_deployments", true);

    // Create runpod_deployments table
    await queryRunner.createTable(
      new Table({
        name: "runpod_deployments",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "model_id",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "region",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "gpu_type",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          {
            name: "status",
            type: "enum",
            enum: [
              "pending",
              "deploying",
              "running",
              "scaling",
              "stopping",
              "stopped",
              "failed",
            ],
            default: "'pending'",
          },
          {
            name: "min_replicas",
            type: "integer",
            default: 1,
          },
          {
            name: "max_replicas",
            type: "integer",
            default: 3,
          },
          {
            name: "current_replicas",
            type: "integer",
            default: 0,
          },
          {
            name: "auto_scaling",
            type: "boolean",
            default: true,
          },
          {
            name: "max_idle_time",
            type: "integer",
            default: 300,
          },
          {
            name: "container_disk_size",
            type: "integer",
            default: 50,
          },
          {
            name: "volume_size",
            type: "integer",
            default: 100,
          },
          {
            name: "endpoint_url",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "runpod_endpoint_id",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "configuration",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "last_health_check",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "health_status",
            type: "varchar",
            default: "'unknown'",
          },
          {
            name: "error_message",
            type: "text",
            isNullable: true,
          },
          {
            name: "deployment_cost_per_hour",
            type: "decimal",
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: "carbon_intensity",
            type: "decimal",
            precision: 10,
            scale: 6,
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create runpod_instances table
    await queryRunner.createTable(
      new Table({
        name: "runpod_instances",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "deployment_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "runpod_pod_id",
            type: "varchar",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "status",
            type: "enum",
            enum: [
              "pending",
              "starting",
              "running",
              "stopping",
              "stopped",
              "failed",
              "terminated",
            ],
            default: "'pending'",
          },
          {
            name: "pod_name",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "machine_id",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "gpu_count",
            type: "integer",
            default: 1,
          },
          {
            name: "vcpu_count",
            type: "integer",
            isNullable: true,
          },
          {
            name: "memory_gb",
            type: "integer",
            isNullable: true,
          },
          {
            name: "disk_gb",
            type: "integer",
            isNullable: true,
          },
          {
            name: "internal_ip",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "external_ip",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "port_mappings",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "runtime_seconds",
            type: "integer",
            default: 0,
          },
          {
            name: "cost_per_hour",
            type: "decimal",
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: "total_cost",
            type: "decimal",
            precision: 10,
            scale: 4,
            default: 0,
          },
          {
            name: "last_activity",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "started_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "stopped_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "error_message",
            type: "text",
            isNullable: true,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "last_health_check",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "health_check_failures",
            type: "integer",
            default: 0,
          },
          {
            name: "consecutive_failures",
            type: "integer",
            default: 0,
          },
          {
            name: "requests_processed",
            type: "integer",
            default: 0,
          },
          {
            name: "tokens_processed",
            type: "integer",
            default: 0,
          },
          {
            name: "average_response_time_ms",
            type: "decimal",
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create indexes for runpod_deployments
    await queryRunner.createIndex(
      "runpod_deployments",
      new TableIndex({
        name: "IDX_runpod_deployments_model_region",
        columnNames: ["model_id", "region"],
      }),
    );
    await queryRunner.createIndex(
      "runpod_deployments",
      new TableIndex({
        name: "IDX_runpod_deployments_status",
        columnNames: ["status"],
      }),
    );

    // Create indexes for runpod_instances
    await queryRunner.createIndex(
      "runpod_instances",
      new TableIndex({
        name: "IDX_runpod_instances_deployment_id",
        columnNames: ["deployment_id"],
      }),
    );
    await queryRunner.createIndex(
      "runpod_instances",
      new TableIndex({
        name: "IDX_runpod_instances_runpod_pod_id",
        columnNames: ["runpod_pod_id"],
      }),
    );
    await queryRunner.createIndex(
      "runpod_instances",
      new TableIndex({
        name: "IDX_runpod_instances_status",
        columnNames: ["status"],
      }),
    );

    // Create foreign key relationship
    await queryRunner.createForeignKey(
      "runpod_instances",
      new TableForeignKey({
        name: "FK_runpod_instances_deployment",
        columnNames: ["deployment_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "runpod_deployments",
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable("runpod_instances");
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("deployment_id") !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey("runpod_instances", foreignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex(
      "runpod_instances",
      "IDX_runpod_instances_status",
    );
    await queryRunner.dropIndex(
      "runpod_instances",
      "IDX_runpod_instances_runpod_pod_id",
    );
    await queryRunner.dropIndex(
      "runpod_instances",
      "IDX_runpod_instances_deployment_id",
    );
    await queryRunner.dropIndex(
      "runpod_deployments",
      "IDX_runpod_deployments_status",
    );
    await queryRunner.dropIndex(
      "runpod_deployments",
      "IDX_runpod_deployments_model_region",
    );

    // Drop tables
    await queryRunner.dropTable("runpod_instances");
    await queryRunner.dropTable("runpod_deployments");
  }
}
