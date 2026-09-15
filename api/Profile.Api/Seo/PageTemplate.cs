namespace Profile.Api.Seo;

/// <summary>
/// The Vite-built index.html, moved to templates/page.html in the image so it is
/// never served raw as a static file. Tests and a bare `dotnet run` use the
/// fallback, which has the same placeholders.
/// </summary>
public sealed class PageTemplate(IWebHostEnvironment env)
{
    public const string Fallback = """
        <!doctype html>
        <html lang="<!--app-lang-->" dir="<!--app-dir-->">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><!--app-head--></head>
        <body><div id="root"><!--app-body--></div></body>
        </html>
        """;

    public string Html { get; } = File.Exists(Path.Combine(env.ContentRootPath, "templates", "page.html"))
        ? File.ReadAllText(Path.Combine(env.ContentRootPath, "templates", "page.html"))
        : Fallback;
}
