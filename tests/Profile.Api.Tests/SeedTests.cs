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

        // Not vacuous: the CV has eight roles (six main, two additional) and at least four projects.
        Assert.Equal(8, journey.Count);
        Assert.True(projects.Count >= 4);

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
}
