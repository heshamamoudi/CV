using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profile.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class EditorialContentRevision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContentRevisions",
                columns: table => new
                {
                    Key = table.Column<string>(type: "text", nullable: false),
                    AppliedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentRevisions", x => x.Key);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContentRevisions");
        }
    }
}
