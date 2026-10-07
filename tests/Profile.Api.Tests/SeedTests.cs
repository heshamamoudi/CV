using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class SeedTests
{
    private static ProfileContext NewDb() =>
        new(new DbContextOptionsBuilder<ProfileContext>().UseInMemoryDatabase("seed-" + Guid.NewGuid()).Options);

    [Fact]
    public async Task Seeding_twice_inserts_once()
    {
        await using var db = NewDb();

        await ContentSeed.EnsureAsync(db);
        var journeyAfterFirst = await db.JourneyEntries.CountAsync();
        await ContentSeed.EnsureAsync(db);

        Assert.Equal(1, await db.Profiles.CountAsync());
        Assert.Equal(journeyAfterFirst, await db.JourneyEntries.CountAsync());
    }

    [Fact]
    public async Task Every_seeded_item_is_complete_in_both_languages()
    {
        await using var db = NewDb();
        await ContentSeed.EnsureAsync(db);

        var journey = await db.JourneyEntries.Include(j => j.Highlights).ToListAsync();
        var projects = await db.Projects.ToListAsync();

        // The public portfolio keeps the two selected case studies, each complete in both languages.
        Assert.Equal(8, journey.Count);
        Assert.Equal(new[] { "selfhost-platform", "inviteqr" }, projects.OrderBy(p => p.SortOrder).Select(p => p.Slug));
        Assert.All(projects, project => Assert.NotNull(project.CoverMediaId));

        foreach (var lang in Lang.Supported)
        {
            Assert.All(journey, j => Assert.True(j.IsComplete(lang), $"journey {j.Title.En} incomplete in {lang}"));
            Assert.All(projects, p => Assert.True(p.IsComplete(lang), $"project {p.Slug} incomplete in {lang}"));
        }
    }

    [Fact]
    public async Task The_current_role_is_open_ended()
    {
        await using var db = NewDb();
        await ContentSeed.EnsureAsync(db);

        var current = await db.JourneyEntries.SingleAsync(j => j.EndDate == null);
        Assert.Equal("Lead Application Development", current.Title.En);
        Assert.Equal(new DateOnly(2025, 7, 1), current.StartDate);
    }

    [Fact]
    public async Task Seeded_copy_uses_plain_titles_and_natural_case_study_text()
    {
        await using var db = NewDb();
        await ContentSeed.EnsureAsync(db);

        var selfhost = await db.Projects.SingleAsync(p => p.Slug == "selfhost-platform");
        var inviteQr = await db.Projects.SingleAsync(p => p.Slug == "inviteqr");
        var hajjRole = await db.JourneyEntries.SingleAsync(j => j.Title.En == "Software Development Department Manager");

        Assert.Equal("Selfhost: From code to production", selfhost.Title.En);
        Assert.Equal("InviteQR: Wedding guest management", inviteQr.Title.En);
        Assert.DoesNotContain("Problem:", selfhost.Body.En);
        Assert.DoesNotContain("→", selfhost.Body.En);
        Assert.DoesNotContain("—", hajjRole.Organisation.En);
    }

    [Fact]
    public async Task Copy_refresh_keeps_owner_written_titles_and_stories()
    {
        await using var db = NewDb();
        await ContentSeed.EnsureAsync(db);
        db.ContentRevisions.Remove(await db.ContentRevisions.SingleAsync(r => r.Key == ContentCopyRefresh.Revision));

        var project = await db.Projects.SingleAsync(p => p.Slug == "selfhost-platform");
        project.Title.En = "A title I wrote";
        project.Body.En = "A story I wrote";
        var role = await db.JourneyEntries.SingleAsync(j => j.Title.En == "Software Development Department Manager");
        role.Organisation.En = "An employer label I wrote";
        await db.SaveChangesAsync();

        await ContentCopyRefresh.ApplyAsync(db);

        Assert.Equal("A title I wrote", project.Title.En);
        Assert.Equal("A story I wrote", project.Body.En);
        Assert.Equal("An employer label I wrote", role.Organisation.En);
    }
}
