using System.Net.Http.Headers;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Seo;

public static class PageRoutes
{
    public static void MapPages(this WebApplication app)
    {
        app.MapGet("/", (HttpContext http) =>
        {
            http.Response.Headers.Vary = "Accept-Language";
            return Results.Redirect("/" + PreferredLanguage(http.Request.Headers.AcceptLanguage.ToString()));
        });

        // The language is constrained in the route itself. An unconstrained {lang}
        // would also match root files like /favicon.svg, and a matched endpoint
        // stops UseStaticFiles from serving them.
        const string L = "{lang:regex(^(en|ar)$)}";

        app.MapGet("/" + L, (string lang, HttpContext http, ContentService c, PageRenderer r, CancellationToken ct) =>
            PageAsync(PageKind.Home, lang, null, http, c, r, ct));
        app.MapGet("/" + L + "/journey", (string lang, HttpContext http, ContentService c, PageRenderer r, CancellationToken ct) =>
            PageAsync(PageKind.Journey, lang, null, http, c, r, ct));
        app.MapGet("/" + L + "/projects", (string lang, HttpContext http, ContentService c, PageRenderer r, CancellationToken ct) =>
            PageAsync(PageKind.Projects, lang, null, http, c, r, ct));
        app.MapGet("/" + L + "/projects/{slug}", (string lang, string slug, HttpContext http, ContentService c, PageRenderer r, CancellationToken ct) =>
            PageAsync(PageKind.Project, lang, slug, http, c, r, ct));

        // Anything else without a file extension (MapFallback's default pattern is
        // {*path:nonfile}, so /assets/*.js still reaches the static files): a real 404 page.
        app.MapFallback(async (HttpContext http, ContentService c, PageRenderer r, CancellationToken ct) =>
        {
            var first = http.Request.Path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            var lang = Lang.IsSupported(first) ? first! : Lang.En;
            return await NotFoundAsync(lang, c, r, ct);
        });
    }

    private static async Task<IResult> PageAsync(PageKind kind, string lang, string? slug, HttpContext http,
        ContentService content, PageRenderer renderer, CancellationToken ct)
    {
        if (!Lang.IsSupported(lang)) return await NotFoundAsync(Lang.En, content, renderer, ct);

        var home = await content.HomeAsync(lang, ct);
        if (home is null) return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);

        ProjectDto? project = null;
        if (kind == PageKind.Project)
        {
            project = await content.ProjectAsync(lang, slug!, ct);
            if (project is null) return await NotFoundAsync(lang, content, renderer, ct);
        }

        /* ONE URL PER PAGE. Routing matches case-insensitively and tolerates a
           trailing slash, so /en/Journey and /en/journey/ both reached here - and
           each declared itself canonical, which search engines treat as duplicate
           content. The canonical path comes from what the page IS, and any other
           spelling is sent there permanently. */
        var canonical = kind switch
        {
            PageKind.Journey => $"/{lang}/journey",
            PageKind.Projects => $"/{lang}/projects",
            PageKind.Project => $"/{lang}/projects/{project!.Slug}",
            _ => $"/{lang}",
        };
        if (!string.Equals(http.Request.Path.Value, canonical, StringComparison.Ordinal))
            return Results.Redirect(canonical + http.Request.QueryString, permanent: true);

        var html = renderer.Render(kind, lang, home, project, canonical);
        return Results.Content(html, "text/html; charset=utf-8");
    }

    internal static async Task<IResult> NotFoundAsync(string lang, ContentService content, PageRenderer renderer, CancellationToken ct)
    {
        var home = await content.HomeAsync(lang, ct);
        var html = renderer.Render(PageKind.NotFound, lang, home, null, "/" + lang);
        return Results.Content(html, "text/html; charset=utf-8", statusCode: StatusCodes.Status404NotFound);
    }

    internal static string PreferredLanguage(string header)
    {
        if (string.IsNullOrWhiteSpace(header)) return Lang.En;
        var best = header.Split(',')
            .Select(part => StringWithQualityHeaderValue.TryParse(part.Trim(), out var v) ? v : null)
            // q=0 means "not acceptable", not "least preferred".
            .Where(v => v is not null && (v.Quality ?? 1.0) > 0)
            .OrderByDescending(v => v!.Quality ?? 1.0)
            .FirstOrDefault();
        return best?.Value.StartsWith("ar", StringComparison.OrdinalIgnoreCase) == true ? Lang.Ar : Lang.En;
    }
}
