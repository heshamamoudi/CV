using System.Xml.Linq;

namespace Profile.Api.Tests;

public class DiscoveryTests
{
    private static async Task<HttpClient> ClientAsync()
    {
        var app = TestApp.Create(s => InMemoryDb.Use(s, "discovery-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        return app.CreateClient();
    }

    [Fact]
    public async Task Sitemap_lists_every_page_in_both_languages_with_alternates()
    {
        var xml = XDocument.Parse(await (await ClientAsync()).GetStringAsync("/sitemap.xml"));
        XNamespace sm = "http://www.sitemaps.org/schemas/sitemap/0.9";
        XNamespace xhtml = "http://www.w3.org/1999/xhtml";

        var urls = xml.Descendants(sm + "url").ToList();
        var locs = urls.Select(u => u.Element(sm + "loc")!.Value).ToList();

        Assert.Contains("https://heshamamoudi.com/en", locs);
        Assert.Contains("https://heshamamoudi.com/ar", locs);
        Assert.Contains("https://heshamamoudi.com/ar/projects/safety-management-system", locs);
        Assert.Equal(6 + 2 * 5, urls.Count); // 3 pages × 2 languages + 5 projects × 2 languages

        var arHome = urls.Single(u => u.Element(sm + "loc")!.Value == "https://heshamamoudi.com/ar");
        Assert.Contains(arHome.Elements(xhtml + "link"),
            l => (string?)l.Attribute("hreflang") == "en" && (string?)l.Attribute("href") == "https://heshamamoudi.com/en");
        Assert.All(urls, u => Assert.NotNull(u.Element(sm + "lastmod")));
    }

    [Fact]
    public async Task Robots_keeps_crawlers_out_of_admin_and_points_at_the_sitemap()
    {
        var robots = await (await ClientAsync()).GetStringAsync("/robots.txt");

        Assert.Contains("Disallow: /admin", robots);
        Assert.Contains("Disallow: /api/admin", robots);
        Assert.Contains("Sitemap: https://heshamamoudi.com/sitemap.xml", robots);
    }
}
