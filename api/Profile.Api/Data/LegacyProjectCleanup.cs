using Microsoft.EntityFrameworkCore;

namespace Profile.Api.Data;

/// <summary>Remove the five original CV placeholders once, without touching later owner projects.</summary>
public static class LegacyProjectCleanup
{
    public const string Revision = "retire-original-cv-projects-2026-10-02";

    public static readonly IReadOnlySet<string> Slugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "kaia-external-website",
        "airport-process-automation",
        "safety-management-system",
        "hajj-1445-operations-modules",
        "hajj-1444-centers-performance",
    };

    public static async Task ApplyAsync(ProfileContext db, CancellationToken ct = default)
    {
        if (await db.ContentRevisions.AnyAsync(r => r.Key == Revision, ct)) return;
        var slugs = Slugs.ToArray();
        var rows = await db.Projects.Where(p => slugs.Contains(p.Slug)).ToListAsync(ct);
        db.Projects.RemoveRange(rows);
        db.ContentRevisions.Add(new ContentRevision { Key = Revision });
        await db.SaveChangesAsync(ct);
    }
}
