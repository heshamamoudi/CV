using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class CompletenessTests
{
    [Fact]
    public async Task The_seeded_content_is_complete()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        Assert.Empty((await admin.GetFromJsonAsync<JsonArray>("/api/admin/completeness"))!);
    }

    [Fact]
    public async Task Blanking_one_arabic_highlight_and_one_profile_field_is_reported_precisely()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        profile["quote"]!["ar"] = "";
        await admin.PutAsJsonAsync("/api/admin/profile", profile);

        // The journey admin endpoint arrives with another task; edit the stored entry directly.
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProfileContext>();
            var role = await db.JourneyEntries.Include(j => j.Highlights).OrderBy(j => j.SortOrder).FirstAsync();
            role.Highlights.OrderBy(h => h.SortOrder).ElementAt(1).Ar = "";
            await db.SaveChangesAsync();
        }

        var report = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/completeness"))!;

        Assert.Equal(2, report.Count);
        Assert.Contains(report, i => i!["area"]!.GetValue<string>() == "profile" && i["missing"]!.AsArray().Any(m => m!.GetValue<string>() == "quote.ar"));
        Assert.Contains(report, i => i!["area"]!.GetValue<string>() == "journey" && i["missing"]!.AsArray().Any(m => m!.GetValue<string>() == "highlights[1].ar"));
    }

    [Fact]
    public async Task An_image_with_english_alt_text_only_is_reported()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var id = Guid.NewGuid();
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProfileContext>();
            db.Media.Add(new Media { Id = id, FileName = "hero.webp", Width = 1920, Height = 1080, Alt = LocalizedText.Of("Riyadh at night", "") });
            await db.SaveChangesAsync();
        }

        var item = Assert.Single((await admin.GetFromJsonAsync<JsonArray>("/api/admin/completeness"))!)!;

        Assert.Equal("media", item["area"]!.GetValue<string>());
        Assert.Equal(id.ToString(), item["id"]!.GetValue<string>());
        Assert.Equal("hero.webp", item["label"]!.GetValue<string>());
        Assert.Equal(["alt.ar"], item["missing"]!.AsArray().Select(m => m!.GetValue<string>()));
    }

    [Fact]
    public async Task The_admin_shell_is_served_only_when_signed_in_and_never_cached_or_indexed()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        var signedIn = await admin.GetAsync("/admin/journey");
        var html = await signedIn.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
        Assert.Contains("no-store", signedIn.Headers.CacheControl!.ToString());
        Assert.Contains("<meta name=\"robots\" content=\"noindex\">", html);
        Assert.Contains("\"kind\":\"admin\"", html);

        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateClient().GetAsync("/admin")).StatusCode);
    }

    [Fact]
    public async Task The_admin_shell_carries_no_content_only_its_kind()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();

        var html = await admin.GetStringAsync("/admin");

        Assert.Contains("<script type=\"application/json\" id=\"page-data\">{\"kind\":\"admin\"}</script>", html);
        Assert.DoesNotContain("هشام", html);
        Assert.DoesNotContain("canonical", html);
    }
}
