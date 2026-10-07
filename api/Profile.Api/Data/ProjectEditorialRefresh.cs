using Microsoft.EntityFrameworkCore;

namespace Profile.Api.Data;

/// <summary>One-time, source-backed case studies. Owner changes and later deletions are never reseeded.</summary>
public static class ProjectEditorialRefresh
{
    public const string Revision = "project-case-studies-2026-09-30";

    public static async Task ApplyAsync(ProfileContext db, CancellationToken ct = default)
    {
        if (await db.ContentRevisions.AnyAsync(r => r.Key == Revision, ct)) return;
        var projects = await db.Projects.OrderBy(p => p.SortOrder).ToListAsync(ct);

        // These five records came from the CV. Fill only languages whose body is still blank.
        var cvBodies = new Dictionary<string, (string TitleEn, string TitleAr, string En, string Ar)>
        {
            ["kaia-external-website"] = ("King Abdulaziz International Airport website", "الموقع الإلكتروني لمطار الملك عبدالعزيز الدولي",
                "At Jeddah Airports Company, I led development of the King Abdulaziz International Airport external website.",
                "في شركة مطارات جدة، قدت تطوير الموقع الإلكتروني الخارجي لمطار الملك عبدالعزيز الدولي."),
            ["airport-process-automation"] = ("Airport process automation", "أتمتة إجراءات المطار",
                "At Jeddah Airports Company, I automated more than 90 business processes across King Abdulaziz International Airport operations.",
                "في شركة مطارات جدة، أتمتُّ أكثر من ٩٠ إجراءً تشغيليًا في مطار الملك عبدالعزيز الدولي."),
            ["safety-management-system"] = ("Safety Management System", "نظام إدارة السلامة",
                "I implemented a Safety Management System that improved operational compliance at Jeddah Airports Company.",
                "نفّذتُ نظام إدارة السلامة في شركة مطارات جدة، مما أسهم في تحسين الامتثال التشغيلي."),
            ["hajj-1445-operations-modules"] = ("Hajj 1445 operations modules", "وحدات تشغيل حج 1445هـ",
                "As Software Development Department Manager for Rakeen during Hajj 1445, I led development of the Workforce, Live Feed Pilgrims, Evaluation and Violations modules and ensured delivery on time.",
                "بصفتي مدير إدارة تطوير البرمجيات في ركِين خلال موسم حج ١٤٤٥هـ، قدت تطوير وحدات القوى العاملة والبث المباشر للحجاج والتقييم والمخالفات، وضمنت تسليمها في موعدها."),
            ["hajj-1444-centers-performance"] = ("Centers Performance Excellence", "التميز في أداء المراكز",
                "As Software Development Team Lead at Mashariq during Hajj 1444, I led the Centers Performance Excellence programme, launched the system and ran training workshops.",
                "بصفتي قائد فريق تطوير البرمجيات في مشارق خلال موسم حج ١٤٤٤هـ، قدت برنامج التميز في أداء المراكز، وأطلقت النظام ونفّذت ورشًا تدريبية."),
        };
        foreach (var row in projects)
        {
            if (!cvBodies.TryGetValue(row.Slug, out var body)) continue;
            var changed = false;
            if (row.Title.En == body.TitleEn && string.IsNullOrWhiteSpace(row.Body.En))
            {
                row.Body.En = body.En;
                changed = true;
            }
            if (row.Title.Ar == body.TitleAr && string.IsNullOrWhiteSpace(row.Body.Ar))
            {
                row.Body.Ar = body.Ar;
                changed = true;
            }
            if (changed) row.UpdatedAt = DateTimeOffset.UtcNow;
        }

        var order = projects.Count == 0 ? 0 : projects.Min(p => p.SortOrder) - 2;
        var selfhost = projects.FirstOrDefault(p => p.Slug == "selfhost-platform");
        if (!projects.Any(p => p.Slug == "selfhost-platform"))
        {
            db.Projects.Add(new Project
            {
                Slug = "selfhost-platform",
                WorkflowTitle = LocalizedText.Of("How it works", "كيف يعمل"),
                WorkflowCaption = LocalizedText.Of("From deployment to reliable operations.", "من النشر إلى تشغيل موثوق."),
                WorkflowStageOne = LocalizedText.Of("Deploy", "النشر"),
                WorkflowStageTwo = LocalizedText.Of("Monitor", "المراقبة"),
                WorkflowStageThree = LocalizedText.Of("Recover", "الاستعادة"),
                Title = LocalizedText.Of("Selfhost: From code to production", "Selfhost: من الشيفرة إلى التشغيل"),
                Summary = LocalizedText.Of(
                    "A self-hosted operations platform that brings deployment, service health and recovery into one control panel.",
                    "منصة استضافة ذاتية تجمع نشر التطبيقات ومراقبة الخدمات والاستعادة في لوحة تحكم واحدة."),
                Body = LocalizedText.Of(
                    "I was spending too much time deploying, monitoring and recovering several applications.\n\nTo make this easier, I built a .NET 8 Blazor Server control panel for Docker workloads, with a Node.js host agent and PostgreSQL. GitHub Actions publishes images to GHCR. Cloudflare Tunnel exposes services, while Cloudflare Access protects the control panel. Repository checks lead into a release process that builds, runs and verifies each service before it goes live. Deployments wait for health checks and can roll back.\n\nToday, the panel shows live service health, CPU, memory and logs, alongside deploy history, backups, restore drills and an activity audit. It gives me one place to manage routine releases and recovery.",
                    "كان تشغيل عدة تطبيقات يجعل النشر والمراقبة والاستعادة أعمالاً متكررة.\n\nبنيت لوحة تحكم باستخدام ‎.NET 8 وBlazor Server لإدارة خدمات Docker، مع وكيل مضيف مبني بـNode.js وقاعدة PostgreSQL. تنشر GitHub Actions الصور إلى GHCR. يعرض Cloudflare Tunnel الخدمات، بينما تحمي Cloudflare Access لوحة التحكم. تفحص المنصة المستودع، ثم تبني كل خدمة وتشغلها وتتحقق من صحتها قبل إتاحتها. ويمكن التراجع عن أي نشر عند الفشل.\n\nتعرض اللوحة صحة الخدمات واستهلاك المعالج والذاكرة والسجلات المباشرة، إلى جانب سجل النشر والنسخ الاحتياطية وتجارب الاستعادة وسجل النشاط. أصبحت لدي مساحة واحدة أتابع منها النشر والاستعادة."),
                Technologies = [".NET 8", "Blazor Server", "PostgreSQL", "Docker", "Node.js", "GitHub Actions", "Cloudflare"],
                RepositoryUrl = "https://github.com/heshamamoudi/selfhost",
                LiveUrl = "https://admin.fikrahaive.com",
                SortOrder = order++,
                Featured = !projects.Any(p => p.Featured),
            });
            order++;
        }
        else
        {
            order = selfhost!.SortOrder + 1;
        }
        if (!projects.Any(p => p.Slug == "inviteqr"))
        {
            db.Projects.Add(new Project
            {
                Slug = "inviteqr",
                WorkflowTitle = LocalizedText.Of("How it works", "كيف يعمل"),
                WorkflowCaption = LocalizedText.Of("A clear path from invitation to arrival.", "مسار واضح من الدعوة إلى الوصول."),
                WorkflowStageOne = LocalizedText.Of("Invite", "الدعوة"),
                WorkflowStageTwo = LocalizedText.Of("Guest", "الضيف"),
                WorkflowStageThree = LocalizedText.Of("Check in", "الدخول"),
                Title = LocalizedText.Of("InviteQR: Wedding guest management", "InviteQR: إدارة ضيوف الزواج"),
                Summary = LocalizedText.Of(
                    "An Arabic-first wedding platform with a branded portal and a private guest list for every couple.",
                    "منصة زفاف عربية تمنح كل زوجين بوابة بطابعهما الخاص وقائمة ضيوف مستقلة."),
                Body = LocalizedText.Of(
                    "Managing guest lists through an operator made every change take an extra step. Each couple needed a private space that felt like their own celebration.\n\nThe operator provisions a portal on its own subdomain. Couples see their chosen template, names and colours, then manage their guest list directly. Arabic-first Razor Pages and lightweight updates keep the mobile experience responsive. Bulk name entry tidies Arabic text, while tenant-scoped queries and access rules keep guest lists separate.\n\nCouples can check guest status and export their lists as PDF or Excel. The operator can oversee every portal, while each couple sees only its own guests.",
                    "كانت إدارة قوائم الضيوف عبر المشغّل تجعل كل تعديل خطوة إضافية. واحتاج كل زوجين إلى مساحة خاصة تعكس طابع مناسبتهما.\n\nينشئ المشغّل بوابة على نطاق فرعي مستقل. يرى الزوجان القالب والأسماء والألوان التي اختاراها، ثم يديران قائمة الضيوف مباشرة. وتبقي صفحات Razor العربية والتحديثات الخفيفة تجربة الجوال سريعة. كما يوحّد الإدخال الجماعي كتابة الأسماء العربية، وتفصل صلاحيات الوصول قوائم كل زوجين.\n\nيتابع الزوجان حالة الضيوف ويصدران قائمتهما إلى PDF أو Excel. ويمكن للمشغّل متابعة جميع البوابات، بينما لا يرى كل زوجين سوى ضيوفه."),
                Technologies = [".NET 8", "Razor Pages", "EF Core", "PostgreSQL", "JavaScript", "Docker", "QuestPDF", "ClosedXML"],
                RepositoryUrl = "https://github.com/heshamamoudi/inviteQr",
                LiveUrl = "https://inviteqr.info",
                SortOrder = order,
                Featured = false,
            });
        }

        db.ContentRevisions.Add(new ContentRevision { Key = Revision });
        await db.SaveChangesAsync(ct);
    }
}
