using System.Xml.Linq;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Seo;

public static class Discovery
{
    private static readonly XNamespace Sm = "http://www.sitemaps.org/schemas/sitemap/0.9";
    private static readonly XNamespace Xhtml = "http://www.w3.org/1999/xhtml";

    public static void MapDiscovery(this WebApplication app)
    {
        app.MapGet("/robots.txt", (SiteOptions site) => Results.Text(
            site.Indexable
                ? $"User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\nSitemap: {site.Absolute("/sitemap.xml")}\n"
                : "User-agent: *\nDisallow: /\n",
            "text/plain; charset=utf-8"));

        app.MapGet("/sitemap.xml", async (SiteOptions site, ContentService content, CancellationToken ct) =>
        {
            var home = await content.HomeAsync(Lang.En, ct);
            // No content yet means every listed page would answer 503.
            if (home is null) return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            var lastmod = home.UpdatedAt.ToString("yyyy-MM-dd");
            var urlset = new XElement(Sm + "urlset", new XAttribute(XNamespace.Xmlns + "xhtml", Xhtml));

            foreach (var suffix in new[] { "", "/journey", "/projects" })
                AddPair(urlset, site, suffix, en: true, ar: true, lastmod);

            foreach (var (slug, en, ar, updated) in await content.ProjectLanguagesAsync(ct))
                AddPair(urlset, site, "/projects/" + slug, en, ar, updated.ToString("yyyy-MM-dd"));

            var doc = new XDocument(new XDeclaration("1.0", "utf-8", null), urlset);
            return Results.Text(doc.Declaration + "\n" + doc.Root, "application/xml; charset=utf-8");
        });
    }

    private static void AddPair(XElement urlset, SiteOptions site, string suffix, bool en, bool ar, string lastmod)
    {
        foreach (var (lang, present) in new[] { (Lang.En, en), (Lang.Ar, ar) })
        {
            if (!present) continue;
            var url = new XElement(Sm + "url",
                new XElement(Sm + "loc", site.Absolute($"/{lang}{suffix}")),
                new XElement(Sm + "lastmod", lastmod));
            if (en && ar)
            {
                foreach (var alt in Lang.Supported)
                    url.Add(new XElement(Xhtml + "link", new XAttribute("rel", "alternate"),
                        new XAttribute("hreflang", alt), new XAttribute("href", site.Absolute($"/{alt}{suffix}"))));
            }
            urlset.Add(url);
        }
    }
}
