using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Profile.Api.Data;

/// <summary>A one-time CV edit, conditional on the original seed. Never reseeds deleted rows or touches projects.</summary>
public static class CvContentRefresh
{
    public const string Revision = "cv-editorial-2026-09-30";
    private sealed record Change(LocalizedText Before, LocalizedText After);
    private sealed record RoleEdit(string Title, string Organisation, DateOnly Start, LocalizedText Summary,
        LocalizedText[] BeforeHighlights, LocalizedText[] Highlights);
    private sealed record ContentEdit(Dictionary<string, Change> Profile, RoleEdit[] Journey);

    public static async Task ApplyAsync(ProfileContext db, CancellationToken ct = default)
    {
        if (await db.ContentRevisions.AnyAsync(r => r.Key == Revision, ct)) return;
        using var stream = typeof(CvContentRefresh).Assembly.GetManifestResourceStream("cv-content-2026-09.json")!;
        var edit = (await JsonSerializer.DeserializeAsync<ContentEdit>(stream, new JsonSerializerOptions(JsonSerializerDefaults.Web), ct))!;
        var profile = await db.Profiles.OrderBy(p => p.Id).FirstOrDefaultAsync(ct);
        if (profile is null) return;

        // Explicit allowlist: the revision cannot alter contact details, media or identity.
        var fields = new Dictionary<string, LocalizedText>
        {
            ["eyebrow"] = profile.Eyebrow, ["heroTitle"] = profile.HeroTitle,
            ["heroSubtitle"] = profile.HeroSubtitle, ["summary"] = profile.Summary,
            ["about"] = profile.About, ["quote"] = profile.Quote,
        };
        var profileChanged = false;
        foreach (var (key, change) in edit.Profile)
        {
            if (!fields.TryGetValue(key, out var value)) continue;
            // Each language is independent: a translated owner edit must survive too.
            if (value.En == change.Before.En && value.En != change.After.En) { value.En = change.After.En; profileChanged = true; }
            if (value.Ar == change.Before.Ar && value.Ar != change.After.Ar) { value.Ar = change.After.Ar; profileChanged = true; }
        }
        if (profileChanged) profile.UpdatedAt = DateTimeOffset.UtcNow;

        var roles = await db.JourneyEntries.Include(j => j.Highlights).ToListAsync(ct);
        foreach (var change in edit.Journey)
        {
            var role = roles.FirstOrDefault(r => r.Title.En == change.Title && r.Organisation.En == change.Organisation && r.StartDate == change.Start);
            if (role is null) continue;
            var original = role.Highlights.OrderBy(h => h.SortOrder).ToList();
            // A customised collection is kept intact; no additions sneak into an edited role.
            if (original.Count != change.BeforeHighlights.Length || original.Where((h, i) =>
                h.En != change.BeforeHighlights[i].En || h.Ar != change.BeforeHighlights[i].Ar).Any()) continue;
            if (role.Summary.En.Length == 0) role.Summary.En = change.Summary.En;
            if (role.Summary.Ar.Length == 0) role.Summary.Ar = change.Summary.Ar;
            // Preserve tracked owned keys for existing highlights; only append extra CV facts.
            for (var i = 0; i < change.Highlights.Length; i++)
            {
                var h = i < original.Count ? original[i] : new Highlight { SortOrder = i };
                h.En = change.Highlights[i].En;
                h.Ar = change.Highlights[i].Ar;
                if (i >= original.Count) role.Highlights.Add(h);
            }
            foreach (var extra in original.Skip(change.Highlights.Length)) role.Highlights.Remove(extra);
            role.UpdatedAt = DateTimeOffset.UtcNow;
        }

        // One SaveChanges transaction commits both the content and its marker.
        db.ContentRevisions.Add(new ContentRevision { Key = Revision });
        await db.SaveChangesAsync(ct);
    }
}
