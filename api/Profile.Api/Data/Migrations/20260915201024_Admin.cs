using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Profile.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Admin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CoverMediaId",
                table: "Projects",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "HeroMediaId",
                table: "Profiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PortraitMediaId",
                table: "Profiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CvFiles",
                columns: table => new
                {
                    Lang = table.Column<string>(type: "text", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    Bytes = table.Column<byte[]>(type: "bytea", nullable: false),
                    Sha256 = table.Column<string>(type: "text", nullable: false),
                    UploadedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CvFiles", x => x.Lang);
                });

            migrationBuilder.CreateTable(
                name: "Media",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    Alt_En = table.Column<string>(type: "text", nullable: false),
                    Alt_Ar = table.Column<string>(type: "text", nullable: false),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    Height = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Media", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProjectSlugRedirects",
                columns: table => new
                {
                    OldSlug = table.Column<string>(type: "text", nullable: false),
                    ProjectId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectSlugRedirects", x => x.OldSlug);
                    table.ForeignKey(
                        name: "FK_ProjectSlugRedirects_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SiteSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    GaMeasurementId = table.Column<string>(type: "text", nullable: false),
                    GaPropertyId = table.Column<string>(type: "text", nullable: false),
                    SearchConsoleToken = table.Column<string>(type: "text", nullable: false),
                    NotificationEmail = table.Column<string>(type: "text", nullable: false),
                    MessageRetentionDays = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SiteSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MediaRenditions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MediaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: false),
                    Bytes = table.Column<byte[]>(type: "bytea", nullable: false),
                    Sha256 = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaRenditions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MediaRenditions_Media_MediaId",
                        column: x => x.MediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PageSeo",
                columns: table => new
                {
                    Key = table.Column<string>(type: "text", nullable: false),
                    Title_En = table.Column<string>(type: "text", nullable: false),
                    Title_Ar = table.Column<string>(type: "text", nullable: false),
                    Description_En = table.Column<string>(type: "text", nullable: false),
                    Description_Ar = table.Column<string>(type: "text", nullable: false),
                    ShareMediaId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageSeo", x => x.Key);
                    table.ForeignKey(
                        name: "FK_PageSeo_Media_ShareMediaId",
                        column: x => x.ShareMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_CoverMediaId",
                table: "Projects",
                column: "CoverMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_Profiles_HeroMediaId",
                table: "Profiles",
                column: "HeroMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_Profiles_PortraitMediaId",
                table: "Profiles",
                column: "PortraitMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaRenditions_MediaId_Width",
                table: "MediaRenditions",
                columns: new[] { "MediaId", "Width" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PageSeo_ShareMediaId",
                table: "PageSeo",
                column: "ShareMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSlugRedirects_ProjectId",
                table: "ProjectSlugRedirects",
                column: "ProjectId");

            migrationBuilder.AddForeignKey(
                name: "FK_Profiles_Media_HeroMediaId",
                table: "Profiles",
                column: "HeroMediaId",
                principalTable: "Media",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Profiles_Media_PortraitMediaId",
                table: "Profiles",
                column: "PortraitMediaId",
                principalTable: "Media",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Media_CoverMediaId",
                table: "Projects",
                column: "CoverMediaId",
                principalTable: "Media",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Profiles_Media_HeroMediaId",
                table: "Profiles");

            migrationBuilder.DropForeignKey(
                name: "FK_Profiles_Media_PortraitMediaId",
                table: "Profiles");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Media_CoverMediaId",
                table: "Projects");

            migrationBuilder.DropTable(
                name: "CvFiles");

            migrationBuilder.DropTable(
                name: "MediaRenditions");

            migrationBuilder.DropTable(
                name: "PageSeo");

            migrationBuilder.DropTable(
                name: "ProjectSlugRedirects");

            migrationBuilder.DropTable(
                name: "SiteSettings");

            migrationBuilder.DropTable(
                name: "Media");

            migrationBuilder.DropIndex(
                name: "IX_Projects_CoverMediaId",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Profiles_HeroMediaId",
                table: "Profiles");

            migrationBuilder.DropIndex(
                name: "IX_Profiles_PortraitMediaId",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "CoverMediaId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "HeroMediaId",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "PortraitMediaId",
                table: "Profiles");
        }
    }
}
