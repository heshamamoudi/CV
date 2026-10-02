using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class ProjectDemoMediaTests
{
    [Fact]
    public async Task Reviewed_covers_are_stored_as_replaceable_media_and_served_publicly()
    {
        var app = TestApp.Create(s => InMemoryDb.Use(s, "project-demo-media-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        using var publicClient = app.CreateClient();

        var selfhost = await publicClient.GetFromJsonAsync<ProjectDto>("/api/public/en/projects/selfhost-platform");
        var inviteQr = await publicClient.GetFromJsonAsync<ProjectDto>("/api/public/ar/projects/inviteqr");

        Assert.NotNull(selfhost?.Cover);
        Assert.NotNull(inviteQr?.Cover);
        Assert.Equal("Demonstration operations dashboard", selfhost!.Cover!.Alt);
        Assert.Equal("قائمة ضيوف تجريبية", inviteQr!.Cover!.Alt);
        Assert.Contains("/1280.webp", selfhost.Cover.Src);
        Assert.Contains("/1280.webp", inviteQr.Cover.Src);
        var image = await publicClient.GetAsync(selfhost.Cover.Src);
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal("image/webp", image.Content.Headers.ContentType!.MediaType);
        Assert.StartsWith("RIFF", System.Text.Encoding.ASCII.GetString((await image.Content.ReadAsByteArrayAsync())[..4]));

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProfileContext>();
        var originalSelfhostMedia = await db.Projects.Where(p => p.Slug == "selfhost-platform").Select(p => p.CoverMediaId).SingleAsync();
        var inviteMedia = await db.Projects.Where(p => p.Slug == "inviteqr").Select(p => p.CoverMediaId).SingleAsync();
        Assert.NotEqual(originalSelfhostMedia, inviteMedia);
        Assert.Equal(1, await db.ContentRevisions.CountAsync(r => r.Key == ProjectDemoMediaRefresh.Revision));
        Assert.Equal(2, await db.Media.CountAsync(m => m.FileName.EndsWith("-demonstration.webp")));
        Assert.All(await db.Media.Where(m => m.FileName.EndsWith("-demonstration.webp")).Select(m => m.Renditions.Count).ToListAsync(), count => Assert.Equal(2, count));

        var ownerEditedProject = await db.Projects.SingleAsync(p => p.Slug == "selfhost-platform");
        ownerEditedProject.CoverMediaId = inviteMedia;
        await db.SaveChangesAsync();
        await ContentSeed.EnsureAsync(db);
        Assert.Equal(inviteMedia, await db.Projects.Where(p => p.Slug == "selfhost-platform").Select(p => p.CoverMediaId).SingleAsync());
    }

    [Fact]
    public async Task Admin_sees_only_the_two_current_projects_and_can_manage_their_cover_media()
    {
        var app = TestApp.Create(s => InMemoryDb.Use(s, "project-demo-admin-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        using var admin = AccessTokens.AdminClient(app);

        var projects = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!;
        var slugs = projects.Select(p => p!["slug"]!.GetValue<string>()).ToList();
        Assert.Equal(new[] { "selfhost-platform", "inviteqr" }, slugs);
        Assert.All(projects, project => Assert.NotNull(project!["coverMediaId"]));

        var media = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/media"))!;
        Assert.Equal(2, media.Count);
        var labels = media.ToDictionary(image => image!["fileName"]!.GetValue<string>(), image => image!["alt"]!.AsObject());
        Assert.Equal("Demonstration operations dashboard", labels["selfhost-demonstration.webp"]["en"]!.GetValue<string>());
        Assert.Equal("لوحة عمليات تجريبية", labels["selfhost-demonstration.webp"]["ar"]!.GetValue<string>());
        Assert.Equal("Demonstration guest list", labels["inviteqr-demonstration.webp"]["en"]!.GetValue<string>());
        Assert.Equal("قائمة ضيوف تجريبية", labels["inviteqr-demonstration.webp"]["ar"]!.GetValue<string>());

        var selfhost = projects.Single(p => p!["slug"]!.GetValue<string>() == "selfhost-platform")!.AsObject();
        var inviteQr = projects.Single(p => p!["slug"]!.GetValue<string>() == "inviteqr")!.AsObject();
        var replacementMediaId = inviteQr["coverMediaId"]!.GetValue<Guid>();
        selfhost["coverMediaId"] = replacementMediaId;
        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync($"/api/admin/projects/{selfhost["id"]}", selfhost)).StatusCode);

        var updated = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!
            .Single(p => p!["slug"]!.GetValue<string>() == "selfhost-platform")!;
        Assert.Equal(replacementMediaId, updated["coverMediaId"]!.GetValue<Guid>());
    }
}
