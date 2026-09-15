using Microsoft.EntityFrameworkCore;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Seo;

/// <summary>What the owner set in admin for a page's head, already resolved for one language.</summary>
public sealed record SeoOverrides(string? Title, string? Description, string? ShareImageUrl, string? SearchConsoleToken)
{
    public static readonly SeoOverrides None = new(null, null, null, null);
}

public sealed class SeoService(ProfileContext db, SiteOptions site)
{
    public static readonly string[] PageKeys = ["home", "journey", "projects"];

    public async Task<SeoOverrides> ForPageAsync(PageKind kind, string lang, HomeData home, ProjectDto? project, CancellationToken ct)
    {
        var key = kind switch { PageKind.Home => "home", PageKind.Journey => "journey", PageKind.Projects => "projects", _ => null };
        var page = key is null ? null : await db.PageSeo.AsNoTracking().FirstOrDefaultAsync(p => p.Key == key, ct);
        var token = await db.SiteSettings.AsNoTracking().Select(s => s.SearchConsoleToken).FirstOrDefaultAsync(ct);

        // A page's own share image, else the project's cover, else the hero.
        var share = page?.ShareMediaId is { } shareId ? await ShareUrlAsync(shareId, ct) : null;
        share ??= project?.Cover?.Src ?? home.Profile.HeroImage?.Src;

        return new SeoOverrides(
            page is not null && page.Title.Has(lang) ? page.Title.For(lang) : null,
            page is not null && page.Description.Has(lang) ? page.Description.For(lang) : null,
            share is null ? null : site.Absolute(share),
            string.IsNullOrWhiteSpace(token) ? null : token);
    }

    private async Task<string?> ShareUrlAsync(Guid id, CancellationToken ct)
    {
        var renditions = await db.MediaRenditions.AsNoTracking().Where(r => r.MediaId == id)
            .Select(r => new { r.Width, r.ContentType }).ToListAsync(ct);
        var ordered = renditions.OrderBy(r => r.Width).ToList();
        var best = ordered.LastOrDefault(r => r.Width <= 1280) ?? ordered.FirstOrDefault();
        return best is null ? null : MediaUrls.Rendition(id, best.Width, best.ContentType);
    }
}
