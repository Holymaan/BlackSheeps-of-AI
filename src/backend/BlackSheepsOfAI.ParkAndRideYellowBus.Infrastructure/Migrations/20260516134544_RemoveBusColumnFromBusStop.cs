using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveBusColumnFromBusStop : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "bus",
                table: "bus_stop");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "bus",
                table: "bus_stop",
                type: "character varying",
                nullable: false,
                defaultValue: "");
        }
    }
}
