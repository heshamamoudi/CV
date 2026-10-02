using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Content;

namespace Profile.Api.Data;

/// <summary>Persists the reviewed demo captures as replaceable project media.</summary>
public static class ProjectDemoMediaRefresh
{
    public const string Revision = "project-demo-covers-2026-10-02";

    public static async Task ApplyAsync(ProfileContext db, CancellationToken ct = default)
    {
        if (await db.ContentRevisions.AnyAsync(r => r.Key == Revision, ct)) return;

        var projects = await db.Projects
            .Where(p => p.Slug == "selfhost-platform" || p.Slug == "inviteqr")
            .ToDictionaryAsync(p => p.Slug, ct);

        foreach (var (slug, filePrefix, altEn, altAr) in new[]
        {
            ("selfhost-platform", "selfhost", "Demonstration operations dashboard", "لوحة عمليات تجريبية"),
            ("inviteqr", "inviteqr", "Demonstration guest list", "قائمة ضيوف تجريبية"),
        })
        {
            if (!projects.TryGetValue(slug, out var project) || project.CoverMediaId is not null) continue;

            var media = new Media
            {
                FileName = $"{filePrefix}-demonstration.webp",
                Alt = LocalizedText.Of(altEn, altAr),
                Width = 1600,
                Height = 900,
                Renditions =
                [
                    await RenditionAsync(filePrefix, 640, ct),
                    await RenditionAsync(filePrefix, 1280, ct),
                ],
            };
            db.Media.Add(media);
            project.CoverMediaId = media.Id;
        }

        db.ContentRevisions.Add(new ContentRevision { Key = Revision });
        await db.SaveChangesAsync(ct);
    }

    private static async Task<MediaRendition> RenditionAsync(string prefix, int width, CancellationToken ct)
    {
        var resource = $"demo-media.{prefix}-{width}.webp";
        await using var input = Assembly.GetExecutingAssembly().GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"Missing embedded demo rendition: {resource}");
        using var output = new MemoryStream();
        await input.CopyToAsync(output, ct);
        var bytes = output.ToArray();
        return new MediaRendition
        {
            Width = width,
            ContentType = "image/webp",
            Bytes = bytes,
            Sha256 = MediaSignature.Sha256(bytes),
        };
    }
}
