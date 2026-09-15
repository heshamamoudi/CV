using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Profile.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Certificates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title_En = table.Column<string>(type: "text", nullable: false),
                    Title_Ar = table.Column<string>(type: "text", nullable: false),
                    Issuer = table.Column<string>(type: "text", nullable: false),
                    IssuedOn = table.Column<DateOnly>(type: "date", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Certificates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Education",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Degree_En = table.Column<string>(type: "text", nullable: false),
                    Degree_Ar = table.Column<string>(type: "text", nullable: false),
                    Institution_En = table.Column<string>(type: "text", nullable: false),
                    Institution_Ar = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Education", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JourneyEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title_En = table.Column<string>(type: "text", nullable: false),
                    Title_Ar = table.Column<string>(type: "text", nullable: false),
                    Organisation_En = table.Column<string>(type: "text", nullable: false),
                    Organisation_Ar = table.Column<string>(type: "text", nullable: false),
                    Summary_En = table.Column<string>(type: "text", nullable: false),
                    Summary_Ar = table.Column<string>(type: "text", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Kind = table.Column<string>(type: "text", nullable: false),
                    Seniority = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Visible = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JourneyEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Profiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name_En = table.Column<string>(type: "text", nullable: false),
                    Name_Ar = table.Column<string>(type: "text", nullable: false),
                    Headline_En = table.Column<string>(type: "text", nullable: false),
                    Headline_Ar = table.Column<string>(type: "text", nullable: false),
                    Eyebrow_En = table.Column<string>(type: "text", nullable: false),
                    Eyebrow_Ar = table.Column<string>(type: "text", nullable: false),
                    HeroTitle_En = table.Column<string>(type: "text", nullable: false),
                    HeroTitle_Ar = table.Column<string>(type: "text", nullable: false),
                    HeroSubtitle_En = table.Column<string>(type: "text", nullable: false),
                    HeroSubtitle_Ar = table.Column<string>(type: "text", nullable: false),
                    Summary_En = table.Column<string>(type: "text", nullable: false),
                    Summary_Ar = table.Column<string>(type: "text", nullable: false),
                    Location_En = table.Column<string>(type: "text", nullable: false),
                    Location_Ar = table.Column<string>(type: "text", nullable: false),
                    About_En = table.Column<string>(type: "text", nullable: false),
                    About_Ar = table.Column<string>(type: "text", nullable: false),
                    Quote_En = table.Column<string>(type: "text", nullable: false),
                    Quote_Ar = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    LinkedInUrl = table.Column<string>(type: "text", nullable: false),
                    GitHubUrl = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Profiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    Title_En = table.Column<string>(type: "text", nullable: false),
                    Title_Ar = table.Column<string>(type: "text", nullable: false),
                    Summary_En = table.Column<string>(type: "text", nullable: false),
                    Summary_Ar = table.Column<string>(type: "text", nullable: false),
                    Body_En = table.Column<string>(type: "text", nullable: false),
                    Body_Ar = table.Column<string>(type: "text", nullable: false),
                    Technologies = table.Column<string>(type: "text", nullable: false),
                    Featured = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Visible = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SpokenLanguages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name_En = table.Column<string>(type: "text", nullable: false),
                    Name_Ar = table.Column<string>(type: "text", nullable: false),
                    Level_En = table.Column<string>(type: "text", nullable: false),
                    Level_Ar = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpokenLanguages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Technologies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Category_En = table.Column<string>(type: "text", nullable: false),
                    Category_Ar = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Technologies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JourneyHighlights",
                columns: table => new
                {
                    JourneyEntryId = table.Column<int>(type: "integer", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    En = table.Column<string>(type: "text", nullable: false),
                    Ar = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JourneyHighlights", x => new { x.JourneyEntryId, x.Id });
                    table.ForeignKey(
                        name: "FK_JourneyHighlights_JourneyEntries_JourneyEntryId",
                        column: x => x.JourneyEntryId,
                        principalTable: "JourneyEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_Slug",
                table: "Projects",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Certificates");

            migrationBuilder.DropTable(
                name: "Education");

            migrationBuilder.DropTable(
                name: "JourneyHighlights");

            migrationBuilder.DropTable(
                name: "Profiles");

            migrationBuilder.DropTable(
                name: "Projects");

            migrationBuilder.DropTable(
                name: "SpokenLanguages");

            migrationBuilder.DropTable(
                name: "Technologies");

            migrationBuilder.DropTable(
                name: "JourneyEntries");
        }
    }
}
