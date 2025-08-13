import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from "typeorm";

// Deprecated migration retained for history; tables are removed by DropNovitaEntities
export class AddNovitaEntities1700000000002 implements MigrationInterface {
  name = "AddNovitaEntities1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop tables if they exist (in case of previous failed migration)
    await queryRunner.dropTable("novita_instances", true);
    await queryRunner.dropTable("novita_deployments", true);

    // Create novita_deployments table
    await queryRunner.createTable(
      new Table({
        name: "novita_deployments",
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
            name: "deployment_type",
            type: "enum",
            enum: ["model_api", "custom", "gpu_instance"],
            default: "'model_api'",
          },
          {
            name: "min_replicas",
            type: "integer",
            default: 0,
          },
          {
            name: "max_replicas",
            type: "integer",
            default: 5,
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
            name: "endpoint_url",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "novita_deployment_id",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "novita_model_id",
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
            length: "20",
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
            name: "total_requests",
            type: "bigint",
            default: 0,
          },
          {
            name: "total_tokens",
            type: "bigint",
            default: 0,
          },
          {
            name: "total_runtime_seconds",
            type: "bigint",
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
            name: "success_rate",
            type: "decimal",
            precision: 5,
            scale: 4,
            default: 1.0,
          },
          {
            name: "last_request_at",
            type: "timestamp",
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
      true
    );

    // Create novita_instances table
    await queryRunner.createTable(
      new Table({
        name: "novita_instances",
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
            name: "novita_instance_id",
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
            name: "instance_name",
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
            name: "consecutive_failures",
            type: "integer",
            default: 0,
          },
          {
            name: "last_failure_reason",
            type: "text",
            isNullable: true,
          },
          {
            name: "startup_time_seconds",
            type: "integer",
            isNullable: true,
          },
          {
            name: "shutdown_time_seconds",
            type: "integer",
            isNullable: true,
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
            name: "peak_memory_usage_gb",
            type: "decimal",
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: "average_gpu_utilization",
            type: "decimal",
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: "network_bytes_in",
            type: "bigint",
            default: 0,
          },
          {
            name: "network_bytes_out",
            type: "bigint",
            default: 0,
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
        ],
      }),
      true
    );

    // Create indexes for novita_deployments
    await queryRunner.createIndex(
      "novita_deployments",
      new TableIndex({
        name: "IDX_novita_deployments_model_id_region",
        columnNames: ["model_id", "region"],
      })
    );

    await queryRunner.createIndex(
      "novita_deployments",
      new TableIndex({
        name: "IDX_novita_deployments_status",
        columnNames: ["status"],
      })
    );

    await queryRunner.createIndex(
      "novita_deployments",
      new TableIndex({
        name: "IDX_novita_deployments_deployment_type",
        columnNames: ["deployment_type"],
      })
    );

    await queryRunner.createIndex(
      "novita_deployments",
      new TableIndex({
        name: "IDX_novita_deployments_health_status",
        columnNames: ["health_status"],
      })
    );

    // Create indexes for novita_instances
    await queryRunner.createIndex(
      "novita_instances",
      new TableIndex({
        name: "IDX_novita_instances_deployment_id",
        columnNames: ["deployment_id"],
      })
    );

    await queryRunner.createIndex(
      "novita_instances",
      new TableIndex({
        name: "IDX_novita_instances_novita_instance_id",
        columnNames: ["novita_instance_id"],
      })
    );

    await queryRunner.createIndex(
      "novita_instances",
      new TableIndex({
        name: "IDX_novita_instances_status",
        columnNames: ["status"],
      })
    );

    // Create foreign key relationship
    await queryRunner.createForeignKey(
      "novita_instances",
      new TableForeignKey({
        columnNames: ["deployment_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "novita_deployments",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable("novita_instances");
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("deployment_id") !== -1
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey("novita_instances", foreignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex(
      "novita_instances",
      "IDX_novita_instances_status"
    );
    await queryRunner.dropIndex(
      "novita_instances",
      "IDX_novita_instances_novita_instance_id"
    );
    await queryRunner.dropIndex(
      "novita_instances",
      "IDX_novita_instances_deployment_id"
    );
    await queryRunner.dropIndex(
      "novita_deployments",
      "IDX_novita_deployments_health_status"
    );
    await queryRunner.dropIndex(
      "novita_deployments",
      "IDX_novita_deployments_deployment_type"
    );
    await queryRunner.dropIndex(
      "novita_deployments",
      "IDX_novita_deployments_status"
    );
    await queryRunner.dropIndex(
      "novita_deployments",
      "IDX_novita_deployments_model_id_region"
    );

    // Drop tables
    await queryRunner.dropTable("novita_instances");
    await queryRunner.dropTable("novita_deployments");
  }
}
