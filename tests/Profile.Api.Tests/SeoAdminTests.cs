using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Profile.Api.Tests;

public class SeoAdminTests
{
    private static JsonObject L(string en, string ar) => new() { ["en"] = en, ["ar"] = ar };

    private static JsonObject Page(string titleAr = "", string descriptionAr = "", Guid? share = null) => new()
    {
        ["title"] = L("", titleAr),
        ["description"] = L("", descriptionAr),
        ["shareMediaId"] = share?.ToString(),
    };

    [Fact]
    public async Task A_page_title_and_description_override_reaches_the_head_in_that_language_only()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var seo = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/seo"))!;
        Assert.Equal(["home", "journey", "projects"], seo["pages"]!.AsArray().Select(p => p!["key"]!.GetValue<string>()));

        var reply = await admin.PutAsJsonAsync("/api/admin/seo/pages/home", Page("هشام العمودي | مطور تطبيقات", "وصف مخصص"));
        Assert.Equal(HttpStatusCode.NoContent, reply.StatusCode);

        var ar = await app.CreateClient().GetStringAsync("/ar");
        var en = await app.CreateClient().GetStringAsync("/en");
        Assert.Contains("<title>هشام العمودي | مطور تطبيقات</title>", ar);
        Assert.Contains("<meta name=\"description\" content=\"وصف مخصص\">", ar);
        Assert.Contains("<meta property=\"og:title\" content=\"هشام العمودي | مطور تطبيقات\">", ar);
        Assert.Contains("<title>Hesham Amoudi — Lead Application Development</title>", en);
        Assert.Equal("وصف مخصص", (await admin.GetFromJsonAsync<JsonObject>("/api/admin/seo"))!["pages"]![0]!["description"]!["ar"]!.GetValue<string>());
    }

    [Fact]
    public async Task The_hero_image_is_the_default_share_image_and_a_page_image_overrides_it()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        async Task<Guid> UploadAsync() => (await (await admin.PostAsync("/api/admin/media",
            MediaTests.Upload(("w1280", Fixtures.Webp())))).Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<Guid>();
        var hero = await UploadAsync();
        var share = await UploadAsync();

        Assert.DoesNotContain("og:image", await app.CreateClient().GetStringAsync("/en/journey"));

        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        profile["heroMediaId"] = hero.ToString();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync("/api/admin/profile", profile)).StatusCode);
        Assert.Contains($"<meta property=\"og:image\" content=\"https://heshamamoudi.com/media/{hero:N}/1280.webp\">",
            await app.CreateClient().GetStringAsync("/en/journey"));

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync("/api/admin/seo/pages/journey", Page(share: share))).StatusCode);
        var html = await app.CreateClient().GetStringAsync("/en/journey");
        Assert.Contains($"<meta property=\"og:image\" content=\"https://heshamamoudi.com/media/{share:N}/1280.webp\">", html);
        Assert.Contains($"<meta name=\"twitter:image\" content=\"https://heshamamoudi.com/media/{share:N}/1280.webp\">", html);
        Assert.Contains($"/media/{hero:N}/1280.webp", await app.CreateClient().GetStringAsync("/en"));

        // In use as a share image, so it cannot be deleted.
        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/api/admin/media/{share}")).StatusCode);
    }

    [Fact]
    public async Task Settings_are_validated_and_the_search_console_token_is_published()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        var bad = await admin.PutAsJsonAsync("/api/admin/seo/settings", new JsonObject
        {
            ["gaMeasurementId"] = "UA-1234", ["gaPropertyId"] = "abc", ["searchConsoleToken"] = "\"><script>",
            ["notificationEmail"] = "nope", ["messageRetentionDays"] = 1,
        });
        var errors = (await bad.Content.ReadFromJsonAsync<JsonObject>())!["errors"]!.AsObject();
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.Equal(["gaMeasurementId", "gaPropertyId", "messageRetentionDays", "notificationEmail", "searchConsoleToken"],
            errors.Select(e => e.Key).Order());
        Assert.DoesNotContain("google-site-verification", await app.CreateClient().GetStringAsync("/en"));

        var good = await admin.PutAsJsonAsync("/api/admin/seo/settings", new JsonObject
        {
            ["gaMeasurementId"] = "G-ABC123XYZ", ["gaPropertyId"] = "123456789", ["searchConsoleToken"] = "abcDEF_123-xyz",
            ["notificationEmail"] = "owner@example.com", ["messageRetentionDays"] = 180,
        });
        Assert.Equal(HttpStatusCode.NoContent, good.StatusCode);
        Assert.Contains("<meta name=\"google-site-verification\" content=\"abcDEF_123-xyz\">", await app.CreateClient().GetStringAsync("/en"));
        Assert.Equal("G-ABC123XYZ", (await admin.GetFromJsonAsync<JsonObject>("/api/admin/seo"))!["settings"]!["gaMeasurementId"]!.GetValue<string>());
    }

    [Fact]
    public async Task Unknown_pages_missing_images_and_overlong_titles_are_refused()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await admin.PutAsJsonAsync("/api/admin/seo/pages/admin", Page())).StatusCode);

        var missing = await admin.PutAsJsonAsync("/api/admin/seo/pages/home", Page(share: Guid.NewGuid()));
        Assert.True((await missing.Content.ReadFromJsonAsync<JsonObject>())!["errors"]!.AsObject().ContainsKey("shareMediaId"));

        var longTitle = await admin.PutAsJsonAsync("/api/admin/seo/pages/home", Page(titleAr: new string('ع', 71)));
        Assert.True((await longTitle.Content.ReadFromJsonAsync<JsonObject>())!["errors"]!.AsObject().ContainsKey("title.ar"));
    }

    [Fact]
    public async Task Reading_the_seo_settings_changes_nothing()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var seo = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/seo"))!;

        Assert.Equal(180, seo["settings"]!["messageRetentionDays"]!.GetValue<int>());
        using var scope = Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.CreateScope(app.Services);
        var db = Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.GetRequiredService<Profile.Api.Data.ProfileContext>(scope.ServiceProvider);
        Assert.Empty(db.PageSeo);
        Assert.Empty(db.SiteSettings);
    }
}
