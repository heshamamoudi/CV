namespace Profile.Api.Seo;

/// <summary>One address for search engines: www.heshamamoudi.com → heshamamoudi.com.</summary>
public sealed class CanonicalHostMiddleware(RequestDelegate next, SiteOptions site)
{
    public Task InvokeAsync(HttpContext http)
    {
        if (http.Request.Host.Host.Equals("www." + site.Host, StringComparison.OrdinalIgnoreCase))
        {
            http.Response.StatusCode = StatusCodes.Status301MovedPermanently;
            http.Response.Headers.Location = site.BaseUrl + http.Request.Path + http.Request.QueryString;
            return Task.CompletedTask;
        }
        return next(http);
    }
}
