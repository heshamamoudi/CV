using Profile.Api.Data;

namespace Profile.Api.Content;

public static class PublicApi
{
    public static void MapPublicApi(this WebApplication app)
    {
        var api = app.MapGroup("/api/public/{lang}");

        api.MapGet("/home", async (string lang, ContentService content, CancellationToken ct) =>
            Lang.IsSupported(lang) && await content.HomeAsync(lang, ct) is { } home
                ? Results.Ok(home)
                : Results.NotFound());

        api.MapGet("/projects/{slug}", async (string lang, string slug, ContentService content, CancellationToken ct) =>
            Lang.IsSupported(lang) && await content.ProjectAsync(lang, slug, ct) is { } project
                ? Results.Ok(project)
                : Results.NotFound());
    }
}
