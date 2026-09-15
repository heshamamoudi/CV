using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;
using Profile.Api.Seo;

namespace Profile.Api.Admin;

public sealed record PageSeoEdit(LocalizedText Title, LocalizedText Description, Guid? ShareMediaId);

public sealed record SettingsEdit(
    string GaMeasurementId, string GaPropertyId, string SearchConsoleToken, string NotificationEmail, int MessageRetentionDays);

public static partial class SeoAdmin
{
    [GeneratedRegex("^G-[A-Z0-9]{4,15}$")] private static partial Regex GaId();
    [GeneratedRegex("^[0-9]{5,15}$")] private static partial Regex PropertyId();
    // Only the content value of Google's verification meta tag; it is written into the page head.
    [GeneratedRegex("^[A-Za-z0-9_-]{10,100}$")] private static partial Regex VerificationToken();

    public static void Map(RouteGroupBuilder admin)
    {
        // Missing rows read as defaults; nothing is created until the owner saves.
        admin.MapGet("/seo", async (ProfileContext db, CancellationToken ct) =>
        {
            var pages = await db.PageSeo.AsNoTracking().ToListAsync(ct);
            var settings = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(ct) ?? new SiteSettings();
            return Results.Ok(new
            {
                Pages = SeoService.PageKeys
                    .Select(k => pages.FirstOrDefault(p => p.Key == k) ?? new PageSeo { Key = k })
                    .Select(p => new { p.Key, p.Title, p.Description, p.ShareMediaId }),
                Settings = new
                {
                    settings.GaMeasurementId, settings.GaPropertyId, settings.SearchConsoleToken,
                    settings.NotificationEmail, settings.MessageRetentionDays,
                },
            });
        });

        admin.MapPut("/seo/pages/{key}", async (ProfileContext db, string key, PageSeoEdit edit, CancellationToken ct) =>
        {
            if (!SeoService.PageKeys.Contains(key)) return Results.NotFound();
            var problems = new Problems().Text("title", edit.Title, 70).Text("description", edit.Description, 200);
            await ProfileAdmin.MediaExists(db, problems, "shareMediaId", edit.ShareMediaId);
            if (problems.Any) return problems.Result();

            var page = await db.PageSeo.FirstOrDefaultAsync(p => p.Key == key, ct);
            if (page is null) db.PageSeo.Add(page = new PageSeo { Key = key });
            page.Title = LocalizedText.Of(edit.Title.En.Trim(), edit.Title.Ar.Trim());
            page.Description = LocalizedText.Of(edit.Description.En.Trim(), edit.Description.Ar.Trim());
            page.ShareMediaId = edit.ShareMediaId;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        admin.MapPut("/seo/settings", async (ProfileContext db, SettingsEdit edit, CancellationToken ct) =>
        {
            var problems = new Problems().Email("notificationEmail", edit.NotificationEmail);
            Optional(problems, "gaMeasurementId", edit.GaMeasurementId, GaId(), "looks like G-XXXXXXXXXX");
            Optional(problems, "gaPropertyId", edit.GaPropertyId, PropertyId(), "the numeric property id");
            Optional(problems, "searchConsoleToken", edit.SearchConsoleToken, VerificationToken(),
                "only the content value of the verification meta tag");
            if (edit.MessageRetentionDays is < 30 or > 3650) problems.Add("messageRetentionDays", "30 to 3650 days");
            if (problems.Any) return problems.Result();

            var settings = await db.SiteSettings.FirstOrDefaultAsync(ct);
            if (settings is null) db.SiteSettings.Add(settings = new SiteSettings());
            settings.GaMeasurementId = edit.GaMeasurementId;
            settings.GaPropertyId = edit.GaPropertyId;
            settings.SearchConsoleToken = edit.SearchConsoleToken;
            settings.NotificationEmail = edit.NotificationEmail;
            settings.MessageRetentionDays = edit.MessageRetentionDays;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    /// <summary>Empty means "not set"; anything else must match exactly.</summary>
    private static void Optional(Problems problems, string field, string? value, Regex pattern, string message)
    {
        if (value is null) problems.Add(field, "required");
        else if (value.Length > 0 && !pattern.IsMatch(value)) problems.Add(field, message);
    }
}
