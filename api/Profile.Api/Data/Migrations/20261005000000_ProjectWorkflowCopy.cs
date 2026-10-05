using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profile.Api.Data.Migrations;

[DbContext(typeof(ProfileContext))]
[Migration("20261005000000_ProjectWorkflowCopy")]
public partial class ProjectWorkflowCopy : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>("WorkflowCaption_Ar", "Projects", type: "text", nullable: false, defaultValue: "فكرة تتحول إلى نتيجة مفيدة.");
        migrationBuilder.AddColumn<string>("WorkflowCaption_En", "Projects", type: "text", nullable: false, defaultValue: "An idea, built into a useful result.");
        migrationBuilder.AddColumn<string>("WorkflowStageOne_Ar", "Projects", type: "text", nullable: false, defaultValue: "التخطيط");
        migrationBuilder.AddColumn<string>("WorkflowStageOne_En", "Projects", type: "text", nullable: false, defaultValue: "Plan");
        migrationBuilder.AddColumn<string>("WorkflowStageThree_Ar", "Projects", type: "text", nullable: false, defaultValue: "التسليم");
        migrationBuilder.AddColumn<string>("WorkflowStageThree_En", "Projects", type: "text", nullable: false, defaultValue: "Deliver");
        migrationBuilder.AddColumn<string>("WorkflowStageTwo_Ar", "Projects", type: "text", nullable: false, defaultValue: "البناء");
        migrationBuilder.AddColumn<string>("WorkflowStageTwo_En", "Projects", type: "text", nullable: false, defaultValue: "Build");
        migrationBuilder.AddColumn<string>("WorkflowTitle_Ar", "Projects", type: "text", nullable: false, defaultValue: "كيف يعمل");
        migrationBuilder.AddColumn<string>("WorkflowTitle_En", "Projects", type: "text", nullable: false, defaultValue: "HOW IT WORKS");

        migrationBuilder.Sql("""
            UPDATE "Projects" SET
              "WorkflowCaption_En" = 'From deployment to reliable operations.',
              "WorkflowCaption_Ar" = 'من النشر إلى تشغيل موثوق.',
              "WorkflowStageOne_En" = 'Deploy', "WorkflowStageOne_Ar" = 'النشر',
              "WorkflowStageTwo_En" = 'Monitor', "WorkflowStageTwo_Ar" = 'المراقبة',
              "WorkflowStageThree_En" = 'Recover', "WorkflowStageThree_Ar" = 'الاستعادة'
            WHERE "Slug" = 'selfhost-platform';

            UPDATE "Projects" SET
              "WorkflowCaption_En" = 'A clear path from invitation to arrival.',
              "WorkflowCaption_Ar" = 'مسار واضح من الدعوة إلى الوصول.',
              "WorkflowStageOne_En" = 'Invite', "WorkflowStageOne_Ar" = 'الدعوة',
              "WorkflowStageTwo_En" = 'Guest', "WorkflowStageTwo_Ar" = 'الضيف',
              "WorkflowStageThree_En" = 'Check in', "WorkflowStageThree_Ar" = 'الدخول'
            WHERE "Slug" = 'inviteqr';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn("WorkflowCaption_Ar", "Projects");
        migrationBuilder.DropColumn("WorkflowCaption_En", "Projects");
        migrationBuilder.DropColumn("WorkflowStageOne_Ar", "Projects");
        migrationBuilder.DropColumn("WorkflowStageOne_En", "Projects");
        migrationBuilder.DropColumn("WorkflowStageThree_Ar", "Projects");
        migrationBuilder.DropColumn("WorkflowStageThree_En", "Projects");
        migrationBuilder.DropColumn("WorkflowStageTwo_Ar", "Projects");
        migrationBuilder.DropColumn("WorkflowStageTwo_En", "Projects");
        migrationBuilder.DropColumn("WorkflowTitle_Ar", "Projects");
        migrationBuilder.DropColumn("WorkflowTitle_En", "Projects");
    }
}
