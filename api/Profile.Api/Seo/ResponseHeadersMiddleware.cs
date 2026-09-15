namespace Profile.Api.Seo;

/// <summary>
/// Headers every response carries. The CSP is strict now because it only gets
/// harder once 3D and analytics arrive: everything executable comes from this
/// origin. The page-data and ld+json blocks are non-executable script types and
/// are not affected by script-src.
/// </summary>
public sealed class ResponseHeadersMiddleware(RequestDelegate next, SiteOptions site)
{
    public const string ContentSecurityPolicy =
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; " +
        "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

    public Task InvokeAsync(HttpContext http)
    {
        http.Response.OnStarting(() =>
        {
            var h = http.Response.Headers;
            h.XContentTypeOptions = "nosniff";
            h.XFrameOptions = "DENY";
            h["Referrer-Policy"] = "strict-origin-when-cross-origin";
            h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            h.ContentSecurityPolicy = ContentSecurityPolicy;
            if (!site.Indexable) h["X-Robots-Tag"] = "noindex, nofollow";
            return Task.CompletedTask;
        });
        return next(http);
    }
}
