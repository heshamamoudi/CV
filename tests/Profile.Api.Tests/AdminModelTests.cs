using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class AdminModelTests
{
    [Fact]
    public async Task Media_with_renditions_cv_files_seo_and_settings_round_trip()
    {
        var options = new DbContextOptionsBuilder<ProfileContext>().UseInMemoryDatabase("model-" + Guid.NewGuid()).Options;
        var id = Guid.NewGuid();

        await using (var db = new ProfileContext(options))
        {
            db.Media.Add(new Media
            {
                Id = id, FileName = "hero.webp", Width = 1920, Height = 1080, Alt = LocalizedText.Of("Riyadh", "الرياض"),
                Renditions = [new MediaRendition { Width = 640, ContentType = "image/webp", Bytes = [1, 2, 3], Sha256 = "abc" }],
            });
            db.CvFiles.Add(new CvFile { Lang = "en", FileName = "cv.pdf", Bytes = [37, 80, 68, 70], Sha256 = "def" });
            db.PageSeo.Add(new PageSeo { Key = "home", Title = LocalizedText.Of("T", "ع"), Description = new(), ShareMediaId = id });
            db.SiteSettings.Add(new SiteSettings { GaMeasurementId = "G-TEST1234" });
            db.ProjectSlugRedirects.Add(new ProjectSlugRedirect { OldSlug = "old", ProjectId = 1 });
            await db.SaveChangesAsync();
        }

        await using (var db = new ProfileContext(options))
        {
            var media = await db.Media.Include(m => m.Renditions).SingleAsync();
            Assert.Equal("الرياض", media.Alt.Ar);
            Assert.Single(media.Renditions);
            Assert.Equal("cv.pdf", (await db.CvFiles.SingleAsync(c => c.Lang == "en")).FileName);
            Assert.Equal(id, (await db.PageSeo.SingleAsync()).ShareMediaId);
            Assert.Equal(180, (await db.SiteSettings.SingleAsync()).MessageRetentionDays);
            Assert.Equal(1, (await db.ProjectSlugRedirects.SingleAsync()).ProjectId);
        }
    }

    [Fact]
    public void Ordered_content_shares_one_ordering_contract()
    {
        Assert.All(new[] { typeof(JourneyEntry), typeof(Project), typeof(Technology), typeof(Certificate), typeof(Education), typeof(SpokenLanguage) },
            t => Assert.True(typeof(IOrdered).IsAssignableFrom(t), t.Name));
    }
}
