using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class ProjectEditorialRefreshTests
{
    private static ProfileContext NewDb() => new(new DbContextOptionsBuilder<ProfileContext>()
        .UseInMemoryDatabase("project-refresh-" + Guid.NewGuid()).Options);

    [Fact]
    public async Task New_cases_are_first_and_refresh_preserves_owner_feature_and_edits()
    {
        await using var db = NewDb();
        await ContentSeed.EnsureAsync(db);
        var existing = await db.Projects.SingleAsync(p => p.Slug == "kaia-external-website");
        var custom = await db.Projects.SingleAsync(p => p.Slug == "airport-process-automation");
        existing.Featured = true;
        existing.Body.En = "My own case study";
        custom.Title.En = "My renamed project";
        custom.Body.En = "";
        var originalUpdatedAt = custom.UpdatedAt;
        db.Projects.RemoveRange(await db.Projects.Where(p => p.Slug == "selfhost-platform" || p.Slug == "inviteqr").ToListAsync());
        db.ContentRevisions.Remove(await db.ContentRevisions.SingleAsync(r => r.Key == ProjectEditorialRefresh.Revision));
        await db.SaveChangesAsync();

        await ProjectEditorialRefresh.ApplyAsync(db);

        var ordered = await db.Projects.OrderBy(p => p.SortOrder).ToListAsync();
        Assert.Equal(new[] { "selfhost-platform", "inviteqr" }, ordered.Take(2).Select(p => p.Slug));
        Assert.False(ordered[0].Featured);
        Assert.True(existing.Featured);
        Assert.Equal("My own case study", existing.Body.En);
        Assert.Equal("", custom.Body.En);
        Assert.Equal(originalUpdatedAt, custom.UpdatedAt);
        Assert.Contains("selfhost", ordered[0].RepositoryUrl);
        Assert.Contains("inviteQr", ordered[1].RepositoryUrl);
    }

    [Fact]
    public async Task Revision_is_idempotent_and_does_not_restore_deleted_projects()
    {
        await using var db = NewDb();
        await ContentSeed.EnsureAsync(db);
        var deleted = await db.Projects.SingleAsync(p => p.Slug == "inviteqr");
        db.Projects.Remove(deleted);
        await db.SaveChangesAsync();

        await ContentSeed.EnsureAsync(db);

        Assert.False(await db.Projects.AnyAsync(p => p.Slug == "inviteqr"));
        Assert.Equal(1, await db.Projects.CountAsync(p => p.Slug == "selfhost-platform"));
        Assert.Equal(1, await db.ContentRevisions.CountAsync(r => r.Key == ProjectEditorialRefresh.Revision));
    }
}
