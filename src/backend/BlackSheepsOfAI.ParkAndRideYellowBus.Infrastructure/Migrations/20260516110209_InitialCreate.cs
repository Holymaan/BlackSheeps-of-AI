using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Postgres cannot auto-cast varchar → uuid; explicit USING is required.
            migrationBuilder.Sql(
                "ALTER TABLE form_submissions ALTER COLUMN form_id TYPE uuid USING form_id::uuid");

            migrationBuilder.CreateTable(
                name: "form_definitions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false),
                    fields = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_form_definitions", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_form_submissions_form_id",
                table: "form_submissions",
                column: "form_id");

            migrationBuilder.AddForeignKey(
                name: "fk_form_submissions_form_definitions_form_id",
                table: "form_submissions",
                column: "form_id",
                principalTable: "form_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_form_submissions_form_definitions_form_id",
                table: "form_submissions");

            migrationBuilder.DropTable(
                name: "form_definitions");

            migrationBuilder.DropIndex(
                name: "ix_form_submissions_form_id",
                table: "form_submissions");

            migrationBuilder.AlterColumn<string>(
                name: "form_id",
                table: "form_submissions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");
        }
    }
}
