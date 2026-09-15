using Profile.Api.Seo;

namespace Profile.Api.Admin;

/// <summary>The admin app's page. Plan 2b's React admin mounts here; the page itself carries no content.</summary>
public static partial class AdminShell
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/admin", Shell).RequireAuthorization("admin");
        app.MapGet("/admin/{**path}", Shell).RequireAuthorization("admin");
    }

    private static IResult Shell(HttpContext http, PageRenderer renderer)
    {
        http.Response.Headers.CacheControl = "no-store";
        return Results.Content(renderer.RenderAdminShell("Admin"), "text/html; charset=utf-8");
    }
}
