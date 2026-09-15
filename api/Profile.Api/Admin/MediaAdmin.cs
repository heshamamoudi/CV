using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Admin;

public sealed record MediaView(
    Guid Id, string FileName, int Width, int Height, LocalizedText Alt, IReadOnlyList<int> Widths, string PreviewUrl, DateTimeOffset CreatedAt);

/// <summary>
/// The image library. The admin browser has already resized every image; the
/// server only checks signature bytes and size and never decodes a picture.
/// </summary>
public static partial class MediaAdmin
{
    public const int MaxRenditionBytes = 3 * 1024 * 1024;

    /// <summary>Three renditions at the limit plus the text fields.</summary>
    private const long MaxRequestBytes = 12 * 1024 * 1024;

    public static void Map(RouteGroupBuilder admin, WebApplication app)
    {
        admin.MapGet("/media", async (ProfileContext db, CancellationToken ct) =>
        {
            var rows = await db.Media.AsNoTracking().OrderByDescending(m => m.CreatedAt)
                .Select(m => new
                {
                    m.Id, m.FileName, m.Width, m.Height, m.Alt, m.CreatedAt,
                    Renditions = m.Renditions.Select(r => new { r.Width, r.ContentType }).ToList(),
                })
                .ToListAsync(ct);

            return Results.Ok(rows.Select(m => View(m.Id, m.FileName, m.Width, m.Height, m.Alt, m.CreatedAt,
                m.Renditions.Select(r => (r.Width, r.ContentType)).ToList())).ToList());
        });

        admin.MapPost("/media", async (HttpRequest request, ProfileContext db, CancellationToken ct) =>
        {
            if (!request.HasFormContentType) return new Problems().Add("form", "multipart form required").Result();

            IFormCollection form;
            try
            {
                form = await request.ReadFormAsync(ct);
            }
            catch (InvalidDataException)
            {
                return new Problems().Add("form", "malformed multipart form").Result();
            }
            catch (BadHttpRequestException e)
            {
                return Results.Problem(statusCode: e.StatusCode, title: "the upload could not be read");
            }

            var problems = new Problems();
            var media = new Media
            {
                FileName = Clip(form["fileName"], 200),
                Width = Dimension(form["width"]),
                Height = Dimension(form["height"]),
                Alt = LocalizedText.Of(Clip(form["altEn"], 300), Clip(form["altAr"], 300)),
            };
            if (media.Width == 0) problems.Add("width", "1 to 20000");
            if (media.Height == 0) problems.Add("height", "1 to 20000");

            foreach (var width in MediaUrls.Widths)
            {
                var field = $"w{width}";
                if (form.Files.GetFile(field) is not { } file) continue;
                if (file.Length > MaxRenditionBytes) { problems.Add(field, "at most 3 MB"); continue; }

                using var stream = new MemoryStream((int)file.Length);
                await file.CopyToAsync(stream, ct);
                var bytes = stream.ToArray();

                // The part's Content-Type and file name are the client's claim; only the bytes count.
                var type = MediaSignature.Detect(bytes);
                if (type is not ("image/webp" or "image/jpeg")) { problems.Add(field, "must be a WebP or JPEG image"); continue; }

                media.Renditions.Add(new MediaRendition
                {
                    Width = width, ContentType = type, Bytes = bytes, Sha256 = MediaSignature.Sha256(bytes),
                });
            }
            if (media.Renditions.Count == 0 && !problems.Any) problems.Add("files", "at least one of w640, w1280, w1920");
            if (problems.Any) return problems.Result();

            db.Media.Add(media);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/admin/media/{media.Id}",
                View(media.Id, media.FileName, media.Width, media.Height, media.Alt, media.CreatedAt,
                    media.Renditions.Select(r => (r.Width, r.ContentType)).ToList()));
        }).WithMetadata(new RequestSizeLimitAttribute(MaxRequestBytes));

        admin.MapPut("/media/{id:guid}", async (ProfileContext db, Guid id, LocalizedText alt, CancellationToken ct) =>
        {
            var problems = new Problems().Text("alt", alt, 300);
            if (problems.Any) return problems.Result();

            var media = await db.Media.FirstOrDefaultAsync(m => m.Id == id, ct);
            if (media is null) return Results.NotFound();
            media.Alt = LocalizedText.Of(alt.En, alt.Ar);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        admin.MapDelete("/media/{id:guid}", async (ProfileContext db, Guid id, CancellationToken ct) =>
        {
            var inUse =
                await db.Profiles.AnyAsync(p => p.HeroMediaId == id || p.PortraitMediaId == id, ct) ||
                await db.Projects.AnyAsync(p => p.CoverMediaId == id, ct) ||
                await db.PageSeo.AnyAsync(p => p.ShareMediaId == id, ct);
            if (inUse) return Results.Problem(statusCode: StatusCodes.Status409Conflict, title: "this image is in use");

            var media = await db.Media.Include(m => m.Renditions).FirstOrDefaultAsync(m => m.Id == id, ct);
            if (media is null) return Results.NotFound();
            db.Media.Remove(media);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Public. A new upload is a new id, so a rendition never changes and can be cached for a year.
        app.MapGet("/media/{id:guid}/{file}", async (ProfileContext db, Guid id, string file, HttpContext http, CancellationToken ct) =>
        {
            var dot = file.IndexOf('.');
            if (dot < 1 || !int.TryParse(file.AsSpan(0, dot), NumberStyles.None, CultureInfo.InvariantCulture, out var width)
                || !MediaUrls.Widths.Contains(width))
                return Results.NotFound();

            var rendition = await db.MediaRenditions.AsNoTracking()
                .Where(r => r.MediaId == id && r.Width == width)
                .Select(r => new { r.ContentType, r.Bytes, r.Sha256 })
                .FirstOrDefaultAsync(ct);

            // Exactly one name per rendition ("1280.webp" - not "01280.webp", not "1280.jpg"):
            // a year-long immutable cache entry must not have aliases.
            if (rendition is null || file != MediaUrls.FileName(width, rendition.ContentType)) return Results.NotFound();

            http.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            return Results.File(rendition.Bytes, rendition.ContentType, entityTag: new EntityTagHeaderValue($"\"{rendition.Sha256}\""));
        });
    }

    private static MediaView View(Guid id, string fileName, int width, int height, LocalizedText alt, DateTimeOffset createdAt,
        IReadOnlyCollection<(int Width, string ContentType)> renditions)
    {
        var ordered = renditions.OrderBy(r => r.Width).ToList();
        var preview = ordered.Count > 0 ? MediaUrls.Rendition(id, ordered[0].Width, ordered[0].ContentType) : "";
        return new MediaView(id, fileName, width, height, alt, ordered.Select(r => r.Width).ToList(), preview, createdAt);
    }

    private static int Dimension(string? value) =>
        int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var n) && n is > 0 and <= 20000 ? n : 0;

    /// <summary>Trimmed, then cut to at most <paramref name="max"/> characters without splitting a surrogate pair.</summary>
    private static string Clip(string? value, int max)
    {
        var trimmed = (value ?? "").Trim();
        if (trimmed.Length <= max) return trimmed;
        var cut = char.IsHighSurrogate(trimmed[max - 1]) ? max - 1 : max;
        return trimmed[..cut];
    }
}
