using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class CvContentRefreshTests
{
    private static ProfileContext NewDb() => new(new DbContextOptionsBuilder<ProfileContext>()
        .UseInMemoryDatabase("cv-refresh-" + Guid.NewGuid()).Options);

    private static JsonObject Edit()
    {
        using var stream = typeof(CvContentRefresh).Assembly.GetManifestResourceStream("cv-content-2026-09.json")!;
        return JsonNode.Parse(stream)!.AsObject();
    }

    [Fact]
    public async Task Fresh_seed_has_cv_based_copy_and_all_roles_remain_complete()
    {
        await using var db = NewDb();
        await ContentSeed.EnsureAsync(db);
        var profile = await db.Profiles.SingleAsync();
        Assert.Contains("90", profile.About.En);
        Assert.Contains("30%", profile.About.En);
        Assert.Contains("90", profile.About.Ar);
        var roles = await db.JourneyEntries.Include(j => j.Highlights).ToListAsync();
        Assert.Equal(8, roles.Count);
        Assert.All(roles, role => {
            Assert.True(role.Summary.Has("en") && role.Summary.Has("ar"));
            Assert.True(role.IsComplete("en") && role.IsComplete("ar"));
        });
        Assert.Equal(5, await db.ContentRevisions.CountAsync());
    }

    [Fact]
    public async Task Existing_edits_deleted_roles_and_projects_survive_the_one_time_refresh()
    {
        await using var db = NewDb();
        await ContentSeed.EnsureAsync(db);
        db.ContentRevisions.RemoveRange(await db.ContentRevisions.ToListAsync());
        var edit = Edit();
        var before = edit["profile"]!["heroTitle"]!["before"]!;
        var profile = await db.Profiles.SingleAsync();
        profile.HeroTitle.En = "My own headline";
        profile.HeroTitle.Ar = before["ar"]!.GetValue<string>();
        var role = await db.JourneyEntries.Include(j => j.Highlights).FirstAsync();
        role.Highlights[0].En = "An achievement I wrote myself";
        var removed = await db.JourneyEntries.OrderBy(j => j.Id).LastAsync();
        db.JourneyEntries.Remove(removed);
        var project = await db.Projects.FirstAsync();
        project.Summary.En = "Project discussion comes later";
        await db.SaveChangesAsync();

        await ContentSeed.EnsureAsync(db);

        Assert.Equal("My own headline", profile.HeroTitle.En);
        Assert.Equal(edit["profile"]!["heroTitle"]!["after"]!["ar"]!.GetValue<string>(), profile.HeroTitle.Ar);
        Assert.Equal("An achievement I wrote myself", role.Highlights[0].En);
        Assert.Equal(7, await db.JourneyEntries.CountAsync());
        Assert.Equal("Project discussion comes later", project.Summary.En);

        // Even deliberately restoring an old seed phrase later is an owner edit.
        profile.HeroTitle.En = before["en"]!.GetValue<string>();
        await db.SaveChangesAsync();
        await ContentSeed.EnsureAsync(db);
        Assert.Equal(before["en"]!.GetValue<string>(), profile.HeroTitle.En);
        Assert.Equal(5, await db.ContentRevisions.CountAsync());
    }
}
