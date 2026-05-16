using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFormSubmissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "form_submissions",
                columns: table => new
                {
                    submission_id = table.Column<Guid>(type: "uuid", nullable: false),
                    form_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    form_version = table.Column<int>(type: "integer", nullable: false),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    values = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_form_submissions", x => x.submission_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "form_submissions");
        }
    }
}
