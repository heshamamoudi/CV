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
        if (!projects.Any(p => p.Slug == "selfhost-platform"))
        {
            db.Projects.Add(new Project
            {
                Slug = "selfhost-platform",
                Title = LocalizedText.Of("Selfhost — from repository to production", "Selfhost — من المستودع إلى التشغيل"),
                Summary = LocalizedText.Of(
                    "A self-hosted operations platform that brings deployment, service health and recovery into one control panel.",
                    "منصة استضافة ذاتية تجمع نشر التطبيقات ومراقبة الخدمات والاستعادة في لوحة تحكم واحدة."),
                Body = LocalizedText.Of(
                    "Problem: Operating several applications made deployment, monitoring and recovery recurring work.\n\nApproach: I built a .NET 8 Blazor Server control panel for Docker workloads, with a Node.js host agent and PostgreSQL. GitHub Actions publishes images to GHCR; Cloudflare Tunnel exposes services and Cloudflare Access protects the control panel. Repository connection and preflight feed a Source → Build → Runtime → Live pipeline. Deployments wait for health checks and can roll back.\n\nOutcome: One panel now shows live service health, CPU, memory and logs, alongside deploy history, backups, restore drills and an activity audit. The workflow makes application delivery and recovery repeatable.",
                    "المشكلة: جعل تشغيل عدة تطبيقات النشرَ والمراقبةَ والاستعادة أعمالًا متكررة.\n\nالنهج: بنيت لوحة تحكم باستخدام ‎.NET 8 وBlazor Server لإدارة خدمات Docker، مع وكيل مضيف مبني بـNode.js وقاعدة PostgreSQL. تنشر GitHub Actions الصور إلى GHCR، ويعرض Cloudflare Tunnel الخدمات بينما تحمي Cloudflare Access لوحة التحكم. يمر ربط المستودع والفحص المسبق بمراحل المصدر ثم البناء ثم التشغيل ثم الإتاحة. تنتظر عمليات النشر اجتياز فحوصات الصحة ويمكن التراجع عنها عند الفشل.\n\nالنتيجة: تعرض لوحة واحدة صحة الخدمات واستهلاك المعالج والذاكرة والسجلات المباشرة، إلى جانب سجل النشر والنسخ الاحتياطية وتجارب الاستعادة وسجل النشاط. أصبح تسليم التطبيقات واستعادتها عملية قابلة للتكرار."),
                Technologies = [".NET 8", "Blazor Server", "PostgreSQL", "Docker", "Node.js", "GitHub Actions", "Cloudflare"],
                RepositoryUrl = "https://github.com/heshamamoudi/selfhost",
                LiveUrl = "https://admin.fikrahaive.com",
                SortOrder = order++,
                Featured = !projects.Any(p => p.Featured),
            });
        }
        if (!projects.Any(p => p.Slug == "inviteqr"))
        {
            db.Projects.Add(new Project
            {
                Slug = "inviteqr",
                Title = LocalizedText.Of("InviteQR — guest management, made personal", "InviteQR — إدارة الضيوف بطابع شخصي"),
                Summary = LocalizedText.Of(
                    "An Arabic-first wedding platform with a branded portal and a private guest list for every couple.",
                    "منصة زفاف عربية تمنح كل زوجين بوابة بطابعهما الخاص وقائمة ضيوف مستقلة."),
                Body = LocalizedText.Of(
                    "Problem: Managing wedding guest lists through an operator made every change indirect. Each couple needed a private place that felt like their own celebration.\n\nApproach: The operator provisions a portal on its own subdomain. The couple sees its chosen template, names and colours, then manages its guest list directly. Arabic-first Razor Pages and small fetch updates keep the mobile experience responsive without a persistent connection. Bulk name entry normalises Arabic input; tenant-scoped queries and access rules keep lists separate.\n\nOutcome: Couples can see guest status counts and export their lists as PDF or Excel. The operator retains a view across portals, while each couple works only with its own guests.",
                    "المشكلة: كانت إدارة قوائم ضيوف الزواج عبر المشغّل تجعل كل تعديل خطوة غير مباشرة. احتاج كل زوجين إلى مساحة خاصة تعكس طابع مناسبتهم.\n\nالنهج: ينشئ المشغّل بوابة على نطاق فرعي مستقل. يرى الزوجان القالب المختار وأسماءهما وألوانهما، ثم يديران قائمة الضيوف مباشرة. تستخدم المنصة صفحات Razor عربية أولًا وتحديثات fetch صغيرة لتبقى مناسبة للجوال دون اتصال دائم. يتيح إدخال الأسماء بالجملة توحيد النص العربي، وتفصل الاستعلامات والصلاحيات قوائم كل زوجين.\n\nالنتيجة: يمكن للزوجين متابعة أعداد الضيوف بحسب الحالة وتصدير القائمة إلى PDF أو Excel. يحتفظ المشغّل برؤية لجميع البوابات، بينما يصل كل زوجين إلى ضيوفهما فقط."),
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
