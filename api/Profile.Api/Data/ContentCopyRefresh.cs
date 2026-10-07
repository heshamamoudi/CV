using Microsoft.EntityFrameworkCore;

namespace Profile.Api.Data;

/// <summary>Polishes original default copy while preserving any owner edits.</summary>
public static class ContentCopyRefresh
{
    public const string Revision = "human-copy-2026-10-07";

    public static async Task ApplyAsync(ProfileContext db, CancellationToken ct = default)
    {
        if (await db.ContentRevisions.AnyAsync(r => r.Key == Revision, ct)) return;

        var projects = await db.Projects.ToListAsync(ct);
        foreach (var project in projects)
        {
            var changed = false;
            if (project.Slug == "selfhost-platform")
            {
                if (project.WorkflowTitle.En == "HOW IT WORKS")
                {
                    project.WorkflowTitle = LocalizedText.Of("How it works", project.WorkflowTitle.Ar);
                    changed = true;
                }
                if (ReplaceExact(project.Title, "Selfhost — from repository to production", "Selfhost: From code to production", "Selfhost — من المستودع إلى التشغيل", "Selfhost: من الشيفرة إلى التشغيل", out var title)) { project.Title = title; changed = true; }
                if (ReplaceExact(project.Body,
                    "Problem: Operating several applications made deployment, monitoring and recovery recurring work.\n\nApproach: I built a .NET 8 Blazor Server control panel for Docker workloads, with a Node.js host agent and PostgreSQL. GitHub Actions publishes images to GHCR; Cloudflare Tunnel exposes services and Cloudflare Access protects the control panel. Repository connection and preflight feed a Source → Build → Runtime → Live pipeline. Deployments wait for health checks and can roll back.\n\nOutcome: One panel now shows live service health, CPU, memory and logs, alongside deploy history, backups, restore drills and an activity audit. The workflow makes application delivery and recovery repeatable.",
                    "I was spending too much time deploying, monitoring and recovering several applications.\n\nTo make this easier, I built a .NET 8 Blazor Server control panel for Docker workloads, with a Node.js host agent and PostgreSQL. GitHub Actions publishes images to GHCR. Cloudflare Tunnel exposes services, while Cloudflare Access protects the control panel. Repository checks lead into a release process that builds, runs and verifies each service before it goes live. Deployments wait for health checks and can roll back.\n\nToday, the panel shows live service health, CPU, memory and logs, alongside deploy history, backups, restore drills and an activity audit. It gives me one place to manage routine releases and recovery.",
                    "المشكلة: جعل تشغيل عدة تطبيقات النشرَ والمراقبةَ والاستعادة أعمالًا متكررة.\n\nالنهج: بنيت لوحة تحكم باستخدام ‎.NET 8 وBlazor Server لإدارة خدمات Docker، مع وكيل مضيف مبني بـNode.js وقاعدة PostgreSQL. تنشر GitHub Actions الصور إلى GHCR، ويعرض Cloudflare Tunnel الخدمات بينما تحمي Cloudflare Access لوحة التحكم. يمر ربط المستودع والفحص المسبق بمراحل المصدر ثم البناء ثم التشغيل ثم الإتاحة. تنتظر عمليات النشر اجتياز فحوصات الصحة ويمكن التراجع عنها عند الفشل.\n\nالنتيجة: تعرض لوحة واحدة صحة الخدمات واستهلاك المعالج والذاكرة والسجلات المباشرة، إلى جانب سجل النشر والنسخ الاحتياطية وتجارب الاستعادة وسجل النشاط. أصبح تسليم التطبيقات واستعادتها عملية قابلة للتكرار.",
                    "كان تشغيل عدة تطبيقات يجعل النشر والمراقبة والاستعادة أعمالاً متكررة.\n\nبنيت لوحة تحكم باستخدام ‎.NET 8 وBlazor Server لإدارة خدمات Docker، مع وكيل مضيف مبني بـNode.js وقاعدة PostgreSQL. تنشر GitHub Actions الصور إلى GHCR. يعرض Cloudflare Tunnel الخدمات، بينما تحمي Cloudflare Access لوحة التحكم. تفحص المنصة المستودع، ثم تبني كل خدمة وتشغلها وتتحقق من صحتها قبل إتاحتها. ويمكن التراجع عن أي نشر عند الفشل.\n\nتعرض اللوحة صحة الخدمات واستهلاك المعالج والذاكرة والسجلات المباشرة، إلى جانب سجل النشر والنسخ الاحتياطية وتجارب الاستعادة وسجل النشاط. أصبحت لدي مساحة واحدة أتابع منها النشر والاستعادة.", out var body)) { project.Body = body; changed = true; }
            }
            else if (project.Slug == "inviteqr")
            {
                if (project.WorkflowTitle.En == "HOW IT WORKS")
                {
                    project.WorkflowTitle = LocalizedText.Of("How it works", project.WorkflowTitle.Ar);
                    changed = true;
                }
                if (ReplaceExact(project.Title, "InviteQR — guest management, made personal", "InviteQR: Wedding guest management", "InviteQR — إدارة الضيوف بطابع شخصي", "InviteQR: إدارة ضيوف الزواج", out var title)) { project.Title = title; changed = true; }
                if (ReplaceExact(project.Body,
                    "Problem: Managing wedding guest lists through an operator made every change indirect. Each couple needed a private place that felt like their own celebration.\n\nApproach: The operator provisions a portal on its own subdomain. The couple sees its chosen template, names and colours, then manages its guest list directly. Arabic-first Razor Pages and small fetch updates keep the mobile experience responsive without a persistent connection. Bulk name entry normalises Arabic input; tenant-scoped queries and access rules keep lists separate.\n\nOutcome: Couples can see guest status counts and export their lists as PDF or Excel. The operator retains a view across portals, while each couple works only with its own guests.",
                    "Managing guest lists through an operator made every change take an extra step. Each couple needed a private space that felt like their own celebration.\n\nThe operator provisions a portal on its own subdomain. Couples see their chosen template, names and colours, then manage their guest list directly. Arabic-first Razor Pages and lightweight updates keep the mobile experience responsive. Bulk name entry tidies Arabic text, while tenant-scoped queries and access rules keep guest lists separate.\n\nCouples can check guest status and export their lists as PDF or Excel. The operator can oversee every portal, while each couple sees only its own guests.",
                    "المشكلة: كانت إدارة قوائم ضيوف الزواج عبر المشغّل تجعل كل تعديل خطوة غير مباشرة. احتاج كل زوجين إلى مساحة خاصة تعكس طابع مناسبتهم.\n\nالنهج: ينشئ المشغّل بوابة على نطاق فرعي مستقل. يرى الزوجان القالب المختار وأسماءهما وألوانهما، ثم يديران قائمة الضيوف مباشرة. تستخدم المنصة صفحات Razor عربية أولًا وتحديثات fetch صغيرة لتبقى مناسبة للجوال دون اتصال دائم. يتيح إدخال الأسماء بالجملة توحيد النص العربي، وتفصل الاستعلامات والصلاحيات قوائم كل زوجين.\n\nالنتيجة: يمكن للزوجين متابعة أعداد الضيوف بحسب الحالة وتصدير القائمة إلى PDF أو Excel. يحتفظ المشغّل برؤية لجميع البوابات، بينما يصل كل زوجين إلى ضيوفهما فقط.",
                    "كانت إدارة قوائم الضيوف عبر المشغّل تجعل كل تعديل خطوة إضافية. واحتاج كل زوجين إلى مساحة خاصة تعكس طابع مناسبتهما.\n\nينشئ المشغّل بوابة على نطاق فرعي مستقل. يرى الزوجان القالب والأسماء والألوان التي اختاراها، ثم يديران قائمة الضيوف مباشرة. وتبقي صفحات Razor العربية والتحديثات الخفيفة تجربة الجوال سريعة. كما يوحّد الإدخال الجماعي كتابة الأسماء العربية، وتفصل صلاحيات الوصول قوائم كل زوجين.\n\nيتابع الزوجان حالة الضيوف ويصدران قائمتهما إلى PDF أو Excel. ويمكن للمشغّل متابعة جميع البوابات، بينما لا يرى كل زوجين سوى ضيوفه.", out var body)) { project.Body = body; changed = true; }
            }
            if (changed) project.UpdatedAt = DateTimeOffset.UtcNow;
        }

        var roles = await db.JourneyEntries.ToListAsync(ct);
        foreach (var role in roles)
        {
            if (role.Title.En == "Software Development Department Manager" && role.Organisation.En == "Rakeen — Hajj season 2024" && role.Organisation.Ar == "ركين — موسم حج 1445هـ")
                role.Organisation = LocalizedText.Of("Rakeen, Hajj season 2024", "ركين، موسم حج 1445هـ");
            else if (role.Title.En == "Software Development Team Lead" && role.Organisation.En == "Mashariq — Hajj season 2023" && role.Organisation.Ar == "مشارق — موسم حج 1444هـ")
                role.Organisation = LocalizedText.Of("Mashariq, Hajj season 2023", "مشارق، موسم حج 1444هـ");
        }

        db.ContentRevisions.Add(new ContentRevision { Key = Revision });
        await db.SaveChangesAsync(ct);
    }

    private static bool ReplaceExact(LocalizedText text, string oldEn, string newEn, string oldAr, string newAr, out LocalizedText updated)
    {
        var changed = false;
        var en = text.En;
        var ar = text.Ar;
        if (en == oldEn) { en = newEn; changed = true; }
        if (ar == oldAr) { ar = newAr; changed = true; }
        updated = changed ? LocalizedText.Of(en, ar) : text;
        return changed;
    }
}
