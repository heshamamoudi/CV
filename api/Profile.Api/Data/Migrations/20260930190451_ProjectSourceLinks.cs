using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profile.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ProjectSourceLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LiveUrl",
                table: "Projects",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RepositoryUrl",
                table: "Projects",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LiveUrl",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "RepositoryUrl",
                table: "Projects");
        }
    }
}
