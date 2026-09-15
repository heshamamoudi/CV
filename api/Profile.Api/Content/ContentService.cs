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

        var shownProjects = projectRows.Where(p => p.IsComplete(lang)).ToList();
        var images = await ImagesAsync(
            new[] { profile.HeroMediaId, profile.PortraitMediaId }.Concat(shownProjects.Select(p => p.CoverMediaId)), lang, ct);

        var projects = shownProjects.Select(p => Map(p, lang, images)).ToList();
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
                profile.Email, SafeHttpUrl(profile.LinkedInUrl), SafeHttpUrl(profile.GitHubUrl),
                Image(images, profile.HeroMediaId), Image(images, profile.PortraitMediaId)),
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
        if (row is null || !row.IsComplete(lang)) return null;
        return Map(row, lang, await ImagesAsync([row.CoverMediaId], lang, ct));
    }

    public async Task<IReadOnlyList<(string Slug, bool En, bool Ar, DateTimeOffset UpdatedAt)>> ProjectLanguagesAsync(
        CancellationToken ct = default)
    {
        var rows = await db.Projects.AsNoTracking().Where(p => p.Visible).OrderBy(p => p.SortOrder).ToListAsync(ct);
        return rows.Select(p => (p.Slug, p.IsComplete(Lang.En), p.IsComplete(Lang.Ar), p.UpdatedAt)).ToList();
    }

    /// <summary>
    /// A link a visitor can click is http or https, or it is nothing. HTML
    /// encoding cannot stop "javascript:alert(1)" - it contains nothing to
    /// encode - and React renders it too. Harmless while only the seed writes
    /// these; stored XSS the moment admin makes them editable.
    /// </summary>
    internal static string SafeHttpUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
            ? value
            : "";

    private static ProjectDto Map(Project p, string lang, IReadOnlyDictionary<Guid, ImageDto> images) => new(
        p.Slug, p.Title.For(lang), p.Summary.For(lang), p.Body.For(lang), p.Technologies, p.Featured,
        p.IsComplete(Lang.Other(lang)), Image(images, p.CoverMediaId));

    /// <summary>A reference to an image that is gone, or has no renditions, is no image - never a broken one.</summary>
    private static ImageDto? Image(IReadOnlyDictionary<Guid, ImageDto> images, Guid? id) =>
        id is { } value && images.TryGetValue(value, out var image) ? image : null;

    /// <summary>
    /// Every wanted image in one query, without the bytes. Src is the largest
    /// rendition up to 1280 px (the smallest if all are larger); SrcSet lists all.
    /// Both are built from the id, width and content type only.
    /// </summary>
    private async Task<IReadOnlyDictionary<Guid, ImageDto>> ImagesAsync(IEnumerable<Guid?> ids, string lang, CancellationToken ct)
    {
        var wanted = ids.OfType<Guid>().Distinct().ToList();
        if (wanted.Count == 0) return new Dictionary<Guid, ImageDto>();

        var rows = await db.Media.AsNoTracking().Where(m => wanted.Contains(m.Id))
            .Select(m => new
            {
                m.Id, m.Alt, m.Width, m.Height,
                Renditions = m.Renditions.Select(r => new { r.Width, r.ContentType }).ToList(),
            })
            .ToListAsync(ct);

        return rows.Where(m => m.Renditions.Count > 0).ToDictionary(m => m.Id, m =>
        {
            var ordered = m.Renditions.OrderBy(r => r.Width).ToList();
            var src = ordered.LastOrDefault(r => r.Width <= 1280) ?? ordered[0];
            return new ImageDto(
                MediaUrls.Rendition(m.Id, src.Width, src.ContentType),
                string.Join(", ", ordered.Select(r => $"{MediaUrls.Rendition(m.Id, r.Width, r.ContentType)} {r.Width}w")),
                m.Width, m.Height, m.Alt.For(lang));
        });
    }
}
