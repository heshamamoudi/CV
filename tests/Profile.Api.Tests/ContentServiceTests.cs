using Microsoft.EntityFrameworkCore;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class ContentServiceTests
{
    private static async Task<ProfileContext> SeededDbAsync()
    {
        var db = new ProfileContext(new DbContextOptionsBuilder<ProfileContext>()
            .UseInMemoryDatabase("content-" + Guid.NewGuid()).Options);
        await ContentSeed.EnsureAsync(db);
        return db;
    }

    [Fact]
    public async Task Home_is_in_the_requested_language()
    {
        await using var db = await SeededDbAsync();
        var home = await new ContentService(db).HomeAsync("ar");

        Assert.NotNull(home);
        Assert.Equal("هشام العمودي", home!.Profile.Name);
        Assert.Contains(home.Journey, j => j.Title == "قائد تطوير التطبيقات" && j.End is null);
    }

    [Fact]
    public async Task Hidden_and_untranslated_items_are_left_out_of_that_language_only()
    {
        await using var db = await SeededDbAsync();
        var hidden = await db.JourneyEntries.FirstAsync(j => j.Title.En == "Web Developer");
        hidden.Visible = false;
        var untranslated = await db.Projects.FirstAsync(p => p.Slug == "safety-management-system");
        untranslated.Title.Ar = "";
        await db.SaveChangesAsync();

        var service = new ContentService(db);
        var en = await service.HomeAsync("en");
        var ar = await service.HomeAsync("ar");

        Assert.DoesNotContain(en!.Journey, j => j.Title == "Web Developer");
        Assert.Contains(en.Projects, p => p.Slug == "safety-management-system");
        Assert.DoesNotContain(ar!.Projects, p => p.Slug == "safety-management-system");
        Assert.NotEmpty(ar.Projects); // not vacuous
    }

    [Fact]
    public async Task A_role_with_an_untranslated_highlight_is_left_out_of_arabic_only()
    {
        await using var db = await SeededDbAsync();
        var role = await db.JourneyEntries.Include(j => j.Highlights).FirstAsync(j => j.Title.En == "Web Developer");
        role.Highlights[0].Ar = "";
        await db.SaveChangesAsync();

        var service = new ContentService(db);
        var en = await service.HomeAsync("en");
        var ar = await service.HomeAsync("ar");

        Assert.Contains(en!.Journey, j => j.Title == "Web Developer");
        Assert.DoesNotContain(ar!.Journey, j => j.Title == "مطور ويب");
        Assert.Equal(en.Journey.Count - 1, ar.Journey.Count); // only that one is gone
    }

    [Fact]
    public async Task The_featured_project_falls_back_to_the_first_visible_one()
    {
        await using var db = await SeededDbAsync();
        var home = await new ContentService(db).HomeAsync("en");

        Assert.Equal(home!.Projects[0].Slug, home.FeaturedProject!.Slug);
    }

    [Fact]
    public async Task Technologies_are_grouped_by_category_in_order()
    {
        await using var db = await SeededDbAsync();
        var home = await new ContentService(db).HomeAsync("en");

        var backEnd = home!.Technologies.Single(g => g.Category == "Back end & APIs");
        Assert.Equal([".NET Web API", ".NET MVC", "Node.js"], backEnd.Items);
    }

    [Fact]
    public async Task An_unknown_project_is_null()
    {
        await using var db = await SeededDbAsync();
        Assert.Null(await new ContentService(db).ProjectAsync("en", "no-such-project"));
    }
}
