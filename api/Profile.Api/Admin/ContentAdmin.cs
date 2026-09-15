using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Admin;

public sealed record JourneyEdit(
    LocalizedText Title, LocalizedText Organisation, LocalizedText Summary, List<LocalizedText> Highlights,
    DateOnly StartDate, DateOnly? EndDate, string Kind, int Seniority, bool Visible);

public sealed record ProjectEdit(
    string Slug, LocalizedText Title, LocalizedText Summary, LocalizedText Body, List<string> Technologies,
    bool Featured, bool Visible, Guid? CoverMediaId);

public sealed record TechnologyEdit(string Name, LocalizedText Category);
public sealed record CertificateEdit(LocalizedText Title, string Issuer, DateOnly IssuedOn);
public sealed record EducationEdit(LocalizedText Degree, LocalizedText Institution);
public sealed record LanguageEdit(LocalizedText Name, LocalizedText Level);

public static partial class ContentAdmin
{
    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();

    public static void Map(RouteGroupBuilder admin)
    {
        OrderedCrud.Map<JourneyEntry, JourneyEdit>(admin, "/journey",
            db => db.JourneyEntries.Include(j => j.Highlights),
            (_, e, _) =>
            {
                var p = new Problems().Text("title", e.Title, 200).Text("organisation", e.Organisation, 200).Text("summary", e.Summary, 2000);
                if (e.Highlights is null) p.Add("highlights", "required");
                else
                {
                    if (e.Highlights.Count > 20) p.Add("highlights", "at most 20");
                    for (var i = 0; i < e.Highlights.Count; i++) p.Text($"highlights[{i}]", e.Highlights[i], 400);
                }
                if (e.EndDate is { } end && end < e.StartDate) p.Add("endDate", "cannot be before the start date");
                if (e.Kind is not ("main" or "additional")) p.Add("kind", "must be main or additional");
                if (e.Seniority is < 1 or > 5) p.Add("seniority", "must be 1 to 5");
                return Task.FromResult(p);
            },
            (_, e, j) =>
            {
                j.Title = e.Title; j.Organisation = e.Organisation; j.Summary = e.Summary;
                j.Highlights.Clear();
                j.Highlights.AddRange(e.Highlights.Select((h, i) => new Highlight { En = h.En, Ar = h.Ar, SortOrder = i }));
                j.StartDate = e.StartDate; j.EndDate = e.EndDate;
                j.Kind = e.Kind == "main" ? JourneyKind.Main : JourneyKind.Additional;
                j.Seniority = e.Seniority; j.Visible = e.Visible; j.UpdatedAt = DateTimeOffset.UtcNow;
                return Task.CompletedTask;
            },
            j => new
            {
                j.Id, j.SortOrder, j.Title, j.Organisation, j.Summary,
                Highlights = j.Highlights.OrderBy(h => h.SortOrder).Select(h => LocalizedText.Of(h.En, h.Ar)),
                j.StartDate, j.EndDate, Kind = j.Kind == JourneyKind.Main ? "main" : "additional", j.Seniority, j.Visible,
            });

        OrderedCrud.Map<Project, ProjectEdit>(admin, "/projects",
            db => db.Projects,
            async (db, e, existing) =>
            {
                var p = new Problems().Text("title", e.Title, 200).Text("summary", e.Summary, 600).Text("body", e.Body, 8000);
                if (e.Slug is null || e.Slug.Length > 80 || !SlugPattern().IsMatch(e.Slug)) p.Add("slug", "lower-case letters, digits and single hyphens");
                else if (await db.Projects.AnyAsync(x => x.Slug == e.Slug && (existing == null || x.Id != existing.Id))) p.Add("slug", "already used by another project");
                if (e.Technologies is null) p.Add("technologies", "required");
                else if (e.Technologies.Count > 30 || e.Technologies.Any(t => string.IsNullOrWhiteSpace(t) || t.Length > 40)) p.Add("technologies", "up to 30 names of at most 40 characters");
                await ProfileAdmin.MediaExists(db, p, "coverMediaId", e.CoverMediaId);
                return p;
            },
            async (db, e, project) =>
            {
                if (project.Slug != e.Slug)
                {
                    // A slug a project lives at is nobody's old link any more. Left in place, a redirect FROM it
                    // would loop (renaming back) or, once the project moves on, point at whichever project had it
                    // before (a new project taking a freed slug) - so it goes on create as well as on rename.
                    db.ProjectSlugRedirects.RemoveRange(await db.ProjectSlugRedirects.Where(r => r.OldSlug == e.Slug).ToListAsync());

                    // Old links keep working.
                    if (project.Id != 0)
                    {
                        var previous = await db.ProjectSlugRedirects.FirstOrDefaultAsync(r => r.OldSlug == project.Slug);
                        if (previous is null) db.ProjectSlugRedirects.Add(new ProjectSlugRedirect { OldSlug = project.Slug, ProjectId = project.Id });
                        else previous.ProjectId = project.Id;
                    }
                }
                if (e.Featured)
                    await db.Projects.Where(x => x.Featured && x.Id != project.Id).ForEachAsync(x => x.Featured = false);

                project.Slug = e.Slug; project.Title = e.Title; project.Summary = e.Summary; project.Body = e.Body;
                project.Technologies = e.Technologies.Select(t => t.Trim()).ToList();
                project.Featured = e.Featured; project.Visible = e.Visible; project.CoverMediaId = e.CoverMediaId;
                project.UpdatedAt = DateTimeOffset.UtcNow;
            },
            p => new { p.Id, p.SortOrder, p.Slug, p.Title, p.Summary, p.Body, p.Technologies, p.Featured, p.Visible, p.CoverMediaId });

        OrderedCrud.Map<Technology, TechnologyEdit>(admin, "/technologies",
            db => db.Technologies,
            (_, e, _) =>
            {
                var p = new Problems().Text("category", e.Category, 100);
                if (string.IsNullOrWhiteSpace(e.Name) || e.Name.Length > 60) p.Add("name", "1 to 60 characters");
                return Task.FromResult(p);
            },
            (_, e, t) => { t.Name = e.Name.Trim(); t.Category = e.Category; return Task.CompletedTask; },
            t => new { t.Id, t.SortOrder, t.Name, t.Category });

        OrderedCrud.Map<Certificate, CertificateEdit>(admin, "/certificates",
            db => db.Certificates,
            (_, e, _) =>
            {
                var p = new Problems().Text("title", e.Title, 200);
                if (string.IsNullOrWhiteSpace(e.Issuer) || e.Issuer.Length > 100) p.Add("issuer", "1 to 100 characters");
                return Task.FromResult(p);
            },
            (_, e, c) => { c.Title = e.Title; c.Issuer = e.Issuer.Trim(); c.IssuedOn = e.IssuedOn; return Task.CompletedTask; },
            c => new { c.Id, c.SortOrder, c.Title, c.Issuer, c.IssuedOn });

        OrderedCrud.Map<Education, EducationEdit>(admin, "/education",
            db => db.Education,
            (_, e, _) => Task.FromResult(new Problems().Text("degree", e.Degree, 200).Text("institution", e.Institution, 200)),
            (_, e, x) => { x.Degree = e.Degree; x.Institution = e.Institution; return Task.CompletedTask; },
            x => new { x.Id, x.SortOrder, x.Degree, x.Institution });

        OrderedCrud.Map<SpokenLanguage, LanguageEdit>(admin, "/languages",
            db => db.SpokenLanguages,
            (_, e, _) => Task.FromResult(new Problems().Text("name", e.Name, 60).Text("level", e.Level, 60)),
            (_, e, l) => { l.Name = e.Name; l.Level = e.Level; return Task.CompletedTask; },
            l => new { l.Id, l.SortOrder, l.Name, l.Level });
    }
}
