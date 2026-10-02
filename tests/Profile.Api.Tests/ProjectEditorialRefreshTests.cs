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
        var existing = await db.Projects.SingleAsync(p => p.Slug == "selfhost-platform");
        existing.Featured = true;
        existing.Body.En = "My own case study";
        db.Projects.Remove(await db.Projects.SingleAsync(p => p.Slug == "inviteqr"));
        db.ContentRevisions.Remove(await db.ContentRevisions.SingleAsync(r => r.Key == ProjectEditorialRefresh.Revision));
        await db.SaveChangesAsync();

        await ProjectEditorialRefresh.ApplyAsync(db);

        var ordered = await db.Projects.OrderBy(p => p.SortOrder).ToListAsync();
        Assert.Equal(new[] { "selfhost-platform", "inviteqr" }, ordered.Select(p => p.Slug));
        Assert.True(existing.Featured);
        Assert.Equal("My own case study", existing.Body.En);
        Assert.Contains("selfhost", ordered[0].RepositoryUrl);
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

    [Fact]
    public async Task Legacy_cleanup_removes_only_the_five_seeded_placeholders_once()
    {
        await using var db = NewDb();
        foreach (var slug in LegacyProjectCleanup.Slugs)
            db.Projects.Add(new Project { Slug = slug, Title = LocalizedText.Of(slug, slug), Summary = LocalizedText.Of("Seed", "بذرة") });
        var owner = new Project { Slug = "owner-project", Title = LocalizedText.Of("Owner", "مالك"), Summary = LocalizedText.Of("Owner", "مالك") };
        db.Projects.Add(owner);
        var media = new Media { FileName = "owner.webp", Alt = LocalizedText.Of("Owner image", "صورة المالك") };
        db.Media.Add(media);
        db.ContactMessages.Add(new ContactMessage { Name = "Owner", Email = "owner@example.test", Subject = "Test", Body = "Keep this", RequestId = Guid.NewGuid() });
        await db.SaveChangesAsync();
        db.ProjectSlugRedirects.Add(new ProjectSlugRedirect { OldSlug = "previous-owner-slug", ProjectId = owner.Id });
        db.PageSeo.Add(new PageSeo { Key = "home", Title = LocalizedText.Of("Owner title", "عنوان المالك"), Description = LocalizedText.Of("Owner description", "وصف المالك") });
        await db.SaveChangesAsync();

        await LegacyProjectCleanup.ApplyAsync(db);

        Assert.Empty(await db.Projects.Where(p => LegacyProjectCleanup.Slugs.Contains(p.Slug)).ToListAsync());
        Assert.True(await db.Projects.AnyAsync(p => p.Id == owner.Id));
        Assert.True(await db.Media.AnyAsync(m => m.Id == media.Id));
        Assert.Equal("Keep this", (await db.ContactMessages.SingleAsync()).Body);
        Assert.True(await db.ProjectSlugRedirects.AnyAsync(r => r.OldSlug == "previous-owner-slug"));
        Assert.True(await db.PageSeo.AnyAsync(p => p.Key == "home"));
        Assert.True(await db.ContentRevisions.AnyAsync(r => r.Key == LegacyProjectCleanup.Revision));

        await db.Projects.AddAsync(new Project { Slug = "late-owner-project", Title = LocalizedText.Of("Late", "لاحق"), Summary = LocalizedText.Of("Late", "لاحق") });
        await db.Projects.AddAsync(new Project { Slug = "kaia-external-website", Title = LocalizedText.Of("Reused by owner", "أعاد المالك استخدامه"), Summary = LocalizedText.Of("Owner", "مالك") });
        await db.SaveChangesAsync();
        await LegacyProjectCleanup.ApplyAsync(db);
        Assert.True(await db.Projects.AnyAsync(p => p.Slug == "late-owner-project"));
        Assert.True(await db.Projects.AnyAsync(p => p.Slug == "kaia-external-website"));
    }

    [Fact]
    public async Task A_later_content_refresh_cannot_restore_retired_projects()
    {
        await using var db = NewDb();
        await ContentSeed.EnsureAsync(db);
        Assert.Empty(await db.Projects.Where(p => LegacyProjectCleanup.Slugs.Contains(p.Slug)).ToListAsync());

        await ContentSeed.EnsureAsync(db);

        Assert.Empty(await db.Projects.Where(p => LegacyProjectCleanup.Slugs.Contains(p.Slug)).ToListAsync());
        Assert.Equal(1, await db.ContentRevisions.CountAsync(r => r.Key == LegacyProjectCleanup.Revision));
    }
}
