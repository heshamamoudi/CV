using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Seo;

public enum PageKind { Home, Journey, Projects, Project, NotFound }

/// <summary>
/// Real content as semantic HTML, the head tags crawlers and link previews read,
/// and the same data embedded for React. One data source for both, so crawlers
/// and visitors see the same page.
/// </summary>
public sealed class PageRenderer(PageTemplate template, SiteOptions site)
{
    private static readonly HtmlEncoder Html = HtmlEncoder.Create(UnicodeRanges.All);
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        // Escapes < > & ' " even with all ranges allowed, so the data cannot close its script tag.
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
    };

    public string Render(PageKind kind, string lang, HomeData? home, ProjectDto? project, string path)
    {
        var head = new StringBuilder();
        var body = new StringBuilder();
        var s = (string key) => UiStrings.Get(lang, key);
        var name = home?.Profile.Name ?? "";

        var (title, description) = kind switch
        {
            PageKind.Home => ($"{name} — {home!.Profile.Headline}", home.Profile.Summary),
            PageKind.Journey => ($"{s("page.journey")} — {name}", home!.Profile.Summary),
            PageKind.Projects => ($"{s("page.projects")} — {name}", home!.Profile.Summary),
            PageKind.Project => ($"{project!.Title} — {name}", project.Summary),
            _ => ($"{s("notFound.title")} — {name}", ""),
        };

        head.Append("<title>").Append(E(title)).Append("</title>");
        if (description.Length > 0)
            head.Append("<meta name=\"description\" content=\"").Append(E(Trim(description, 160))).Append("\">");

        if (kind == PageKind.NotFound)
        {
            head.Append("<meta name=\"robots\" content=\"noindex\">");
        }
        else
        {
            var twin = TwinPath(path, lang);
            var twinExists = kind != PageKind.Project || project!.AvailableInOtherLanguage;
            var enPath = lang == Lang.En ? path : twin;

            head.Append("<link rel=\"canonical\" href=\"").Append(site.Absolute(path)).Append("\">");
            head.Append("<link rel=\"alternate\" hreflang=\"").Append(lang).Append("\" href=\"").Append(site.Absolute(path)).Append("\">");
            if (twinExists)
                head.Append("<link rel=\"alternate\" hreflang=\"").Append(Lang.Other(lang)).Append("\" href=\"").Append(site.Absolute(twin)).Append("\">");
            if (lang == Lang.En || twinExists)
                head.Append("<link rel=\"alternate\" hreflang=\"x-default\" href=\"").Append(site.Absolute(enPath)).Append("\">");

            head.Append("<meta property=\"og:type\" content=\"").Append(kind == PageKind.Home ? "profile" : "website").Append("\">");
            head.Append("<meta property=\"og:title\" content=\"").Append(E(title)).Append("\">");
            head.Append("<meta property=\"og:description\" content=\"").Append(E(Trim(description, 200))).Append("\">");
            head.Append("<meta property=\"og:url\" content=\"").Append(site.Absolute(path)).Append("\">");
            head.Append("<meta property=\"og:locale\" content=\"").Append(lang == Lang.Ar ? "ar_SA" : "en_US").Append("\">");
            head.Append("<meta property=\"og:locale:alternate\" content=\"").Append(lang == Lang.Ar ? "en_US" : "ar_SA").Append("\">");
            head.Append("<meta name=\"twitter:card\" content=\"summary_large_image\">");
            head.Append("<script type=\"application/ld+json\">").Append(StructuredData(kind, lang, home!, project, path)).Append("</script>");
        }

        body.Append("<header><nav>");
        foreach (var (key, href) in new[] { ("nav.home", $"/{lang}"), ("nav.journey", $"/{lang}/journey"), ("nav.projects", $"/{lang}/projects") })
            body.Append("<a href=\"").Append(href).Append("\">").Append(E(s(key))).Append("</a>");
        body.Append("<a href=\"").Append(TwinPath(path, lang)).Append("\" hreflang=\"").Append(Lang.Other(lang)).Append("\">")
            .Append(E(s("language.other"))).Append("</a>");
        body.Append("</nav></header><main>");

        switch (kind)
        {
            case PageKind.Home: Home(body, home!, s); break;
            case PageKind.Journey: body.Append("<h1>").Append(E(s("page.journey"))).Append("</h1>"); Journey(body, home!, s); break;
            case PageKind.Projects: body.Append("<h1>").Append(E(s("page.projects"))).Append("</h1>"); ProjectList(body, home!.Projects, lang); break;
            case PageKind.Project: ProjectDetail(body, project!); break;
            default: body.Append("<h1>").Append(E(s("notFound.title"))).Append("</h1><p><a href=\"/").Append(lang).Append("\">").Append(E(s("notFound.back"))).Append("</a></p>"); break;
        }
        body.Append("</main>");

        var data = JsonSerializer.Serialize(new { kind = kind.ToString().ToLowerInvariant(), lang, path, home, project }, Json);
        body.Append("<script type=\"application/json\" id=\"page-data\">").Append(data).Append("</script>");

        return template.Html
            .Replace("<!--app-lang-->", lang)
            .Replace("<!--app-dir-->", Lang.Direction(lang))
            .Replace("<!--app-head-->", head.ToString())
            .Replace("<!--app-body-->", body.ToString());
    }

    private static void Home(StringBuilder b, HomeData home, Func<string, string> s)
    {
        var p = home.Profile;
        b.Append("<section id=\"hero\"><p>").Append(E(p.Eyebrow)).Append("</p><h1>").Append(E(p.Name)).Append("</h1>")
         .Append("<p>").Append(E(p.Headline)).Append("</p><h2>").Append(E(p.HeroTitle)).Append("</h2><p>").Append(E(p.HeroSubtitle)).Append("</p></section>");

        b.Append("<section id=\"journey\"><h2>").Append(E(s("section.journey"))).Append("</h2>");
        Journey(b, home, s);
        b.Append("</section>");

        if (home.FeaturedProject is { } featured)
        {
            b.Append("<section id=\"project\"><h2>").Append(E(s("section.project"))).Append("</h2>");
            ProjectList(b, [featured], home.Lang);
            b.Append("</section>");
        }

        b.Append("<section id=\"tech\"><h2>").Append(E(s("section.tech"))).Append("</h2>");
        foreach (var group in home.Technologies)
        {
            b.Append("<h3>").Append(E(group.Category)).Append("</h3><ul>");
            foreach (var item in group.Items) b.Append("<li>").Append(E(item)).Append("</li>");
            b.Append("</ul>");
        }
        b.Append("</section>");

        b.Append("<section id=\"about\"><h2>").Append(E(s("section.about"))).Append("</h2><p>").Append(E(p.About)).Append("</p>");
        b.Append("<p>").Append(E(p.Summary)).Append("</p>");
        List(b, s("section.certificates"), home.Certificates.Select(c => $"{c.Title} — {c.Issuer}"));
        List(b, s("section.education"), home.Education.Select(e => $"{e.Degree} — {e.Institution}"));
        List(b, s("section.languages"), home.Languages.Select(l => $"{l.Name} — {l.Level}"));
        b.Append("</section>");

        b.Append("<section id=\"contact\"><h2>").Append(E(s("section.contact"))).Append("</h2><address>")
         .Append("<a href=\"mailto:").Append(E(p.Email)).Append("\">").Append(E(p.Email)).Append("</a> ")
         .Append("<a href=\"").Append(E(p.LinkedInUrl)).Append("\" rel=\"me\">LinkedIn</a> ")
         .Append("<a href=\"").Append(E(p.GitHubUrl)).Append("\" rel=\"me\">GitHub</a> ")
         .Append(E(p.Location)).Append("</address></section>");
    }

    private static void Journey(StringBuilder b, HomeData home, Func<string, string> s)
    {
        b.Append("<ol>");
        foreach (var j in home.Journey)
        {
            b.Append("<li><article><h3>").Append(E(j.Title)).Append("</h3><p>").Append(E(j.Organisation)).Append("</p>")
             .Append("<p><time datetime=\"").Append(j.Start).Append("\">").Append(j.Start).Append("</time> – ")
             .Append(j.End is null ? E(s("journey.present")) : $"<time datetime=\"{j.End}\">{j.End}</time>").Append("</p><ul>");
            foreach (var h in j.Highlights) b.Append("<li>").Append(E(h)).Append("</li>");
            b.Append("</ul></article></li>");
        }
        b.Append("</ol>");
    }

    private static void ProjectList(StringBuilder b, IEnumerable<ProjectDto> projects, string lang)
    {
        foreach (var project in projects)
            b.Append("<article><h3><a href=\"/").Append(lang).Append("/projects/").Append(E(project.Slug)).Append("\">")
             .Append(E(project.Title)).Append("</a></h3><p>").Append(E(project.Summary)).Append("</p></article>");
    }

    private static void ProjectDetail(StringBuilder b, ProjectDto project)
    {
        b.Append("<article><h1>").Append(E(project.Title)).Append("</h1><p>").Append(E(project.Summary)).Append("</p>");
        if (project.Body.Length > 0) b.Append("<p>").Append(E(project.Body)).Append("</p>");
        if (project.Technologies.Count > 0)
        {
            b.Append("<ul>");
            foreach (var t in project.Technologies) b.Append("<li>").Append(E(t)).Append("</li>");
            b.Append("</ul>");
        }
        b.Append("</article>");
    }

    private static void List(StringBuilder b, string heading, IEnumerable<string> items)
    {
        var list = items.ToList();
        if (list.Count == 0) return;
        b.Append("<h3>").Append(E(heading)).Append("</h3><ul>");
        foreach (var item in list) b.Append("<li>").Append(E(item)).Append("</li>");
        b.Append("</ul>");
    }

    private string StructuredData(PageKind kind, string lang, HomeData home, ProjectDto? project, string path)
    {
        var person = new Dictionary<string, object?>
        {
            ["@type"] = "Person",
            ["name"] = home.Profile.Name,
            ["jobTitle"] = home.Profile.Headline,
            ["description"] = home.Profile.Summary,
            ["email"] = "mailto:" + home.Profile.Email,
            ["url"] = site.Absolute($"/{lang}"),
            ["sameAs"] = new[] { home.Profile.LinkedInUrl, home.Profile.GitHubUrl },
            ["knowsAbout"] = home.Technologies.SelectMany(g => g.Items).ToArray(),
            ["worksFor"] = home.Journey.FirstOrDefault(j => j.End is null) is { } current
                ? new Dictionary<string, object?> { ["@type"] = "Organization", ["name"] = current.Organisation }
                : null,
            ["alumniOf"] = home.Education.Select(e => new Dictionary<string, object?> { ["@type"] = "EducationalOrganization", ["name"] = e.Institution }).ToArray(),
            ["knowsLanguage"] = home.Languages.Select(l => l.Name).ToArray(),
        };

        var graph = new List<object>
        {
            new Dictionary<string, object?>
            {
                ["@type"] = "ProfilePage",
                ["url"] = site.Absolute(path),
                ["inLanguage"] = lang,
                ["dateModified"] = home.UpdatedAt.ToString("O"),
                ["mainEntity"] = person,
            },
        };

        if (kind != PageKind.Home)
        {
            var crumbs = new List<(string Name, string Url)> { (home.Profile.Name, site.Absolute($"/{lang}")) };
            if (kind is PageKind.Journey) crumbs.Add((UiStrings.Get(lang, "page.journey"), site.Absolute(path)));
            if (kind is PageKind.Projects or PageKind.Project) crumbs.Add((UiStrings.Get(lang, "page.projects"), site.Absolute($"/{lang}/projects")));
            if (kind is PageKind.Project) crumbs.Add((project!.Title, site.Absolute(path)));

            graph.Add(new Dictionary<string, object?>
            {
                ["@type"] = "BreadcrumbList",
                ["itemListElement"] = crumbs.Select((c, i) => new Dictionary<string, object?>
                {
                    ["@type"] = "ListItem", ["position"] = i + 1, ["name"] = c.Name, ["item"] = c.Url,
                }).ToArray(),
            });
        }

        if (kind is PageKind.Project)
            graph.Add(new Dictionary<string, object?>
            {
                ["@type"] = "CreativeWork", ["name"] = project!.Title, ["description"] = project.Summary,
                ["inLanguage"] = lang, ["url"] = site.Absolute(path), ["creator"] = new Dictionary<string, object?> { ["@type"] = "Person", ["name"] = home.Profile.Name },
            });

        return JsonSerializer.Serialize(new Dictionary<string, object?> { ["@context"] = "https://schema.org", ["@graph"] = graph }, Json);
    }

    internal static string TwinPath(string path, string lang) => "/" + Lang.Other(lang) + path[(1 + lang.Length)..];

    private static string E(string value) => Html.Encode(value);

    private static string Trim(string value, int max) => value.Length <= max ? value : value[..(max - 1)].TrimEnd() + "…";
}
