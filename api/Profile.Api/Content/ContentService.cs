using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Content;

/// <summary>
/// Everything a visitor can see, in one language. Invisible items and items
/// not yet written in that language are left out - never shown in the other
/// language instead.
/// </summary>
public sealed class ContentService(ProfileContext db)
{
    public async Task<HomeData?> HomeAsync(string lang, CancellationToken ct = default)
    {
        var profile = await db.Profiles.AsNoTracking().OrderBy(p => p.Id).FirstOrDefaultAsync(ct);
        if (profile is null) return null;

        var journeyRows = await db.JourneyEntries.AsNoTracking().Include(j => j.Highlights)
            .Where(j => j.Visible).OrderBy(j => j.SortOrder).ToListAsync(ct);
        var projectRows = await db.Projects.AsNoTracking()
            .Where(p => p.Visible).OrderBy(p => p.SortOrder).ToListAsync(ct);
        var techRows = await db.Technologies.AsNoTracking().OrderBy(t => t.SortOrder).ToListAsync(ct);
        var certificates = await db.Certificates.AsNoTracking().OrderBy(c => c.SortOrder).ToListAsync(ct);
        var education = await db.Education.AsNoTracking().OrderBy(e => e.SortOrder).ToListAsync(ct);
        var languages = await db.SpokenLanguages.AsNoTracking().OrderBy(l => l.SortOrder).ToListAsync(ct);

        var projects = projectRows.Where(p => p.IsComplete(lang)).Select(p => Map(p, lang)).ToList();
        var featured = projects.FirstOrDefault(p => p.Featured) ?? projects.FirstOrDefault();

        var updated = new[] { profile.UpdatedAt }
            .Concat(journeyRows.Select(j => j.UpdatedAt))
            .Concat(projectRows.Select(p => p.UpdatedAt))
            .Max();

        return new HomeData(
            lang,
            new ProfileDto(
                profile.Name.For(lang), profile.Headline.For(lang), profile.Eyebrow.For(lang),
                profile.HeroTitle.For(lang), profile.HeroSubtitle.For(lang), profile.Summary.For(lang),
                profile.Location.For(lang), profile.About.For(lang), profile.Quote.For(lang),
                profile.Email, profile.LinkedInUrl, profile.GitHubUrl),
            journeyRows.Where(j => j.IsComplete(lang)).Select(j => new JourneyDto(
                j.Id, j.Title.For(lang), j.Organisation.For(lang), j.Summary.For(lang),
                j.Highlights.OrderBy(h => h.SortOrder).Select(h => h.For(lang)).ToList(),
                j.StartDate.ToString("yyyy-MM"), j.EndDate?.ToString("yyyy-MM"),
                j.Kind == JourneyKind.Main ? "main" : "additional", j.Seniority)).ToList(),
            featured,
            projects,
            techRows.Where(t => t.Category.Has(lang))
                .GroupBy(t => t.Category.For(lang))
                .Select(g => new TechGroupDto(g.Key, g.Select(t => t.Name).ToList())).ToList(),
            certificates.Where(c => c.Title.Has(lang))
                .Select(c => new CertificateDto(c.Title.For(lang), c.Issuer, c.IssuedOn.ToString("yyyy-MM"))).ToList(),
            education.Where(e => e.Degree.Has(lang) && e.Institution.Has(lang))
                .Select(e => new EducationDto(e.Degree.For(lang), e.Institution.For(lang))).ToList(),
            languages.Where(l => l.Name.Has(lang) && l.Level.Has(lang))
                .Select(l => new LanguageDto(l.Name.For(lang), l.Level.For(lang))).ToList(),
            updated);
    }

    public async Task<ProjectDto?> ProjectAsync(string lang, string slug, CancellationToken ct = default)
    {
        var row = await db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Slug == slug && p.Visible, ct);
        return row is not null && row.IsComplete(lang) ? Map(row, lang) : null;
    }

    public async Task<IReadOnlyList<(string Slug, bool En, bool Ar, DateTimeOffset UpdatedAt)>> ProjectLanguagesAsync(
        CancellationToken ct = default)
    {
        var rows = await db.Projects.AsNoTracking().Where(p => p.Visible).OrderBy(p => p.SortOrder).ToListAsync(ct);
        return rows.Select(p => (p.Slug, p.IsComplete(Lang.En), p.IsComplete(Lang.Ar), p.UpdatedAt)).ToList();
    }

    private static ProjectDto Map(Project p, string lang) => new(
        p.Slug, p.Title.For(lang), p.Summary.For(lang), p.Body.For(lang), p.Technologies, p.Featured,
        p.IsComplete(Lang.Other(lang)));
}
