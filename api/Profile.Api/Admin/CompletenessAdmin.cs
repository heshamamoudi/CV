using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Admin;

/// <summary>One item written in one language but not the other; <paramref name="Missing"/> names the empty halves, e.g. "title.ar", "highlights[1].en".</summary>
public sealed record CompletenessItem(string Area, string? Id, string Label, IReadOnlyList<string> Missing);

/// <summary>Everything written in one language but not the other. The Arabic site hides such items; this says which.</summary>
public static partial class CompletenessAdmin
{
    public static void Map(RouteGroupBuilder admin)
    {
        admin.MapGet("/completeness", async (ProfileContext db, CancellationToken ct) =>
        {
            var items = new List<CompletenessItem>();

            void Check(string area, string? id, string label, params (string Field, LocalizedText Text)[] fields)
            {
                var missing = new List<string>();
                foreach (var (field, text) in fields)
                {
                    var hasEn = !string.IsNullOrWhiteSpace(text.En);
                    var hasAr = !string.IsNullOrWhiteSpace(text.Ar);
                    if (hasEn && !hasAr) missing.Add(field + ".ar");
                    if (hasAr && !hasEn) missing.Add(field + ".en");
                }
                if (missing.Count > 0) items.Add(new CompletenessItem(area, id, label, missing));
            }

            if (await db.Profiles.AsNoTracking().OrderBy(p => p.Id).FirstOrDefaultAsync(ct) is { } p)
                Check("profile", null, "Profile", ("name", p.Name), ("headline", p.Headline), ("eyebrow", p.Eyebrow),
                    ("heroTitle", p.HeroTitle), ("heroSubtitle", p.HeroSubtitle), ("summary", p.Summary),
                    ("location", p.Location), ("about", p.About), ("quote", p.Quote));

            foreach (var j in await db.JourneyEntries.AsNoTracking().Include(j => j.Highlights).OrderBy(j => j.SortOrder).ToListAsync(ct))
                Check("journey", j.Id.ToString(), Label(j.Title),
                    new[] { ("title", j.Title), ("organisation", j.Organisation), ("summary", j.Summary) }
                        .Concat(j.Highlights.OrderBy(h => h.SortOrder).Select((h, i) => ($"highlights[{i}]", LocalizedText.Of(h.En, h.Ar))))
                        .ToArray());

            foreach (var x in await db.Projects.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct))
                Check("projects", x.Id.ToString(), x.Slug, ("title", x.Title), ("summary", x.Summary), ("body", x.Body));
            foreach (var x in await db.Technologies.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct))
                Check("technologies", x.Id.ToString(), x.Name, ("category", x.Category));
            foreach (var x in await db.Certificates.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct))
                Check("certificates", x.Id.ToString(), x.Issuer, ("title", x.Title));
            foreach (var x in await db.Education.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct))
                Check("education", x.Id.ToString(), Label(x.Degree), ("degree", x.Degree), ("institution", x.Institution));
            foreach (var x in await db.SpokenLanguages.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct))
                Check("languages", x.Id.ToString(), Label(x.Name), ("name", x.Name), ("level", x.Level));

            // Alt text: an image with none at all is also worth flagging.
            foreach (var m in await db.Media.AsNoTracking().OrderBy(m => m.CreatedAt).ThenBy(m => m.Id)
                         .Select(m => new { m.Id, m.FileName, m.Alt }).ToListAsync(ct))
            {
                var missing = new List<string>();
                if (string.IsNullOrWhiteSpace(m.Alt.En)) missing.Add("alt.en");
                if (string.IsNullOrWhiteSpace(m.Alt.Ar)) missing.Add("alt.ar");
                if (missing.Count > 0) items.Add(new CompletenessItem("media", m.Id.ToString(), m.FileName, missing));
            }

            return Results.Ok(items);
        });
    }

    /// <summary>The English text when there is some, otherwise the Arabic, so an Arabic-only item is still recognisable.</summary>
    private static string Label(LocalizedText text) => string.IsNullOrWhiteSpace(text.En) ? text.Ar : text.En;
}
