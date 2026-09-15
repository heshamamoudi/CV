using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class MediaTests
{
    internal static MultipartFormDataContent Upload(params (string Field, byte[] Bytes)[] files)
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent("hero.webp"), "fileName" },
            { new StringContent("1920"), "width" },
            { new StringContent("1080"), "height" },
            { new StringContent("Riyadh at dusk"), "altEn" },
            { new StringContent("الرياض عند الغروب"), "altAr" },
        };
        foreach (var (field, bytes) in files)
        {
            var part = new ByteArrayContent(bytes);
            part.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream"); // the server must not trust this
            form.Add(part, field, field + ".bin");
        }
        return form;
    }

    [Fact]
    public async Task An_image_is_uploaded_served_immutably_and_shown_as_the_hero()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        var reply = await admin.PostAsync("/api/admin/media", Upload(("w640", Fixtures.Webp(100)), ("w1280", Fixtures.Webp(200))));
        Assert.Equal(HttpStatusCode.Created, reply.StatusCode);
        var media = (await reply.Content.ReadFromJsonAsync<JsonObject>())!;
        var id = media["id"]!.GetValue<Guid>();

        var file = await app.CreateClient().GetAsync($"/media/{id:N}/1280.webp");
        Assert.Equal(HttpStatusCode.OK, file.StatusCode);
        Assert.Equal("image/webp", file.Content.Headers.ContentType!.MediaType);
        Assert.Contains("immutable", file.Headers.CacheControl!.ToString());
        Assert.Equal(200, (await file.Content.ReadAsByteArrayAsync()).Length);

        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        profile["heroMediaId"] = id.ToString();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync("/api/admin/profile", profile)).StatusCode);

        var home = (await app.CreateClient().GetFromJsonAsync<JsonObject>("/api/public/ar/home"))!;
        var hero = home["profile"]!["heroImage"]!;
        Assert.Equal($"/media/{id:N}/1280.webp", hero["src"]!.GetValue<string>());
        Assert.Contains("640w", hero["srcSet"]!.GetValue<string>());
        Assert.Equal("الرياض عند الغروب", hero["alt"]!.GetValue<string>());
    }

    // Rows carry a name, not the bytes: xUnit serialises theory data into the test id, and a 3 MB array
    // gives a row whose result the runner cannot match - it is dropped silently, pass or fail.
    private static readonly Dictionary<string, Func<byte[]>> RejectedFiles = new()
    {
        ["png"] = Fixtures.Png,
        ["svg (script inside an image)"] = Fixtures.Svg,
        ["pdf renamed"] = () => Fixtures.Pdf(),
        ["too large"] = () => Fixtures.Webp(3 * 1024 * 1024 + 1),
    };

    public static TheoryData<string> Rejected => new(RejectedFiles.Keys);

    [Theory]
    [MemberData(nameof(Rejected))]
    public async Task Anything_but_a_webp_or_jpeg_within_limits_is_refused(string why)
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var reply = await admin.PostAsync("/api/admin/media", Upload(("w1280", RejectedFiles[why]())));
        Assert.True(reply.StatusCode == HttpStatusCode.BadRequest, $"{why}: {(int)reply.StatusCode}");
        Assert.Empty((await admin.GetFromJsonAsync<JsonArray>("/api/admin/media"))!);
    }

    [Fact]
    public async Task An_upload_without_any_rendition_is_refused()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync("/api/admin/media", Upload())).StatusCode);
    }

    [Fact]
    public async Task An_image_in_use_cannot_be_deleted_until_it_is_unused()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var id = (await (await admin.PostAsync("/api/admin/media", Upload(("w1280", Fixtures.Jpeg())))).Content
            .ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<Guid>();
        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        profile["portraitMediaId"] = id.ToString();
        await admin.PutAsJsonAsync("/api/admin/profile", profile);

        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/api/admin/media/{id}")).StatusCode);

        profile["portraitMediaId"] = null;
        await admin.PutAsJsonAsync("/api/admin/profile", profile);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/media/{id}")).StatusCode);
    }

    [Fact]
    public async Task A_missing_or_wrongly_named_rendition_is_404()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var id = (await (await admin.PostAsync("/api/admin/media", Upload(("w1280", Fixtures.Webp())))).Content
            .ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<Guid>();
        var client = app.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/media/{id:N}/640.webp")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/media/{id:N}/1280.jpg")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/media/{Guid.NewGuid():N}/1280.webp")).StatusCode);
        // One URL per rendition: an immutable, year-long cache entry must not have aliases.
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/media/{id:N}/01280.webp")).StatusCode);
    }

    [Fact]
    public async Task The_library_lists_images_newest_first_and_alt_text_can_be_edited()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var first = (await (await admin.PostAsync("/api/admin/media", Upload(("w1920", Fixtures.Jpeg()), ("w640", Fixtures.Jpeg()))))
            .Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<Guid>();
        await Task.Delay(20);
        var second = (await (await admin.PostAsync("/api/admin/media", Upload(("w1280", Fixtures.Webp())))).Content
            .ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<Guid>();

        var alt = new { en = "The team", ar = "الفريق" };
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync($"/api/admin/media/{first}", alt)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await admin.PutAsJsonAsync($"/api/admin/media/{first}", new { en = new string('x', 301), ar = "" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PutAsJsonAsync($"/api/admin/media/{Guid.NewGuid()}", alt)).StatusCode);

        var list = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/media"))!;
        Assert.Equal([second, first], list.Select(m => m!["id"]!.GetValue<Guid>()));
        var edited = list[1]!;
        Assert.Equal("الفريق", edited["alt"]!["ar"]!.GetValue<string>());
        Assert.Equal([640, 1920], edited["widths"]!.AsArray().Select(w => w!.GetValue<int>()));
        Assert.Equal($"/media/{first:N}/640.jpg", edited["previewUrl"]!.GetValue<string>());
    }

    [Fact]
    public async Task A_project_cover_uses_the_largest_rendition_up_to_1280_and_a_missing_image_is_no_image()
    {
        await using var db = new ProfileContext(new DbContextOptionsBuilder<ProfileContext>()
            .UseInMemoryDatabase("media-" + Guid.NewGuid()).Options);
        await ContentSeed.EnsureAsync(db);
        var media = new Media
        {
            Width = 1920, Height = 1080, Alt = LocalizedText.Of("Dashboard", "لوحة التحكم"),
            Renditions =
            [
                new MediaRendition { Width = 1920, ContentType = "image/jpeg", Bytes = Fixtures.Jpeg() },
                new MediaRendition { Width = 640, ContentType = "image/jpeg", Bytes = Fixtures.Jpeg() },
            ],
        };
        db.Media.Add(media);
        var project = await db.Projects.FirstAsync(p => p.Slug == "safety-management-system");
        project.CoverMediaId = media.Id;
        await db.SaveChangesAsync();

        var service = new ContentService(db);
        var cover = (await service.ProjectAsync("en", "safety-management-system"))!.Cover!;

        Assert.Equal($"/media/{media.Id:N}/640.jpg", cover.Src);
        Assert.Equal($"/media/{media.Id:N}/640.jpg 640w, /media/{media.Id:N}/1920.jpg 1920w", cover.SrcSet);
        Assert.Equal((1920, 1080, "Dashboard"), (cover.Width, cover.Height, cover.Alt));
        Assert.Equal(cover, (await service.HomeAsync("en"))!.Projects.Single(p => p.Slug == "safety-management-system").Cover);

        project.CoverMediaId = Guid.NewGuid();
        await db.SaveChangesAsync();
        Assert.Null((await service.ProjectAsync("en", "safety-management-system"))!.Cover);
    }
}
