using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Content;
using Profile.Api.Data;
using Profile.Api.Seo;

namespace Profile.Api.Admin;

/// <summary>The downloadable CV: one PDF per language, served publicly with a fallback to the other language.</summary>
public static partial class CvAdmin
{
    public const int MaxBytes = 10 * 1024 * 1024;

    public static void Map(RouteGroupBuilder admin, WebApplication app)
    {
        admin.MapGet("/cv", async (ProfileContext db, CancellationToken ct) =>
            Results.Ok(await db.CvFiles.AsNoTracking().OrderBy(c => c.Lang)
                .Select(c => new { c.Lang, c.FileName, Size = c.Bytes.Length, c.UploadedAt })
                .ToListAsync(ct)));

        admin.MapPut("/cv/{lang}", async (HttpRequest request, ProfileContext db, string lang, CancellationToken ct) =>
        {
            if (!Lang.IsSupported(lang)) return Results.NotFound();
            if (!request.HasFormContentType) return new Problems().Add("file", "multipart form required").Result();

            var form = await request.ReadFormAsync(ct);
            if (form.Files.GetFile("file") is not { } file) return new Problems().Add("file", "required").Result();
            if (file.Length > MaxBytes) return new Problems().Add("file", "at most 10 MB").Result();

            using var stream = new MemoryStream((int)file.Length);
            await file.CopyToAsync(stream, ct);
            var bytes = stream.ToArray();
            if (MediaSignature.Detect(bytes) != "application/pdf") return new Problems().Add("file", "must be a PDF").Result();

            var row = await db.CvFiles.FirstOrDefaultAsync(c => c.Lang == lang, ct);
            if (row is null) db.CvFiles.Add(row = new CvFile { Lang = lang });
            var name = new string(Path.GetFileName(file.FileName).Where(c => !char.IsControl(c)).ToArray()).Trim();
            row.FileName = name.Length is > 0 and <= 200 ? name : "cv.pdf";
            row.Bytes = bytes;
            row.Sha256 = MediaSignature.Sha256(bytes);
            row.UploadedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).WithMetadata(new RequestSizeLimitAttribute(12 * 1024 * 1024));

        admin.MapDelete("/cv/{lang}", async (ProfileContext db, string lang, CancellationToken ct) =>
        {
            var row = await db.CvFiles.FirstOrDefaultAsync(c => c.Lang == lang, ct);
            if (row is null) return Results.NotFound();
            db.CvFiles.Remove(row);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Public download. Lives here rather than in PageRoutes so the CV feature stays in one place.
        app.MapGet("/{lang:regex(^(en|ar)$)}/cv", async (string lang, HttpContext http, ProfileContext db,
            ContentService content, PageRenderer renderer, CancellationToken ct) =>
        {
            // Route regex constraints match case-insensitively, so /AR/cv arrives here as "AR".
            lang = lang.ToLowerInvariant();
            // Requested language first, then the other: never load both PDFs when one will do.
            var file = await db.CvFiles.AsNoTracking().FirstOrDefaultAsync(c => c.Lang == lang, ct)
                ?? await db.CvFiles.AsNoTracking().FirstOrDefaultAsync(c => c.Lang == Lang.Other(lang), ct);
            if (file is null) return await PageRoutes.NotFoundAsync(lang, content, renderer, ct);

            var home = await content.HomeAsync(Lang.En, ct);
            // A replaced CV must be seen promptly, so caches revalidate every time.
            http.Response.Headers.CacheControl = "no-cache";
            return Results.File(file.Bytes, "application/pdf", DownloadName(home?.Profile.Name, file.Lang));
        });
    }

    /// <summary><c>Hesham Amoudi</c> becomes <c>Hesham-Amoudi-CV-en.pdf</c>; only ASCII letters, digits and hyphens survive.</summary>
    internal static string DownloadName(string? englishName, string lang)
    {
        var name = new StringBuilder();
        foreach (var word in (englishName ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            var clean = new string(word.Where(ch => char.IsAsciiLetterOrDigit(ch) || ch == '-').ToArray()).Trim('-');
            if (clean.Length == 0) continue;
            if (name.Length > 0) name.Append('-');
            name.Append(clean);
        }
        return name.Length > 0 ? $"{name}-CV-{lang}.pdf" : $"CV-{lang}.pdf";
    }
}
