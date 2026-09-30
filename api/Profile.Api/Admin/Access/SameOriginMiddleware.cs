using Profile.Api.Seo;
using Microsoft.AspNetCore.Http.Features;

namespace Profile.Api.Admin.Access;

/// <summary>
/// The Access cookie is sent by the browser on any request to this site, so a
/// hostile page could otherwise make the owner's browser change content. Writes
/// under /api/admin or /admin and public contact submissions must prove their origin.
///
/// Middleware rather than an endpoint filter: filters run after the body is
/// bound, so a cross-site request with a body that fails to bind was answered
/// 400 by the binder instead of being refused here. It sits after authorization,
/// so a signed-out request still gets 401.
/// </summary>
public sealed class SameOriginMiddleware(RequestDelegate next, SiteOptions site)
{
    public Task InvokeAsync(HttpContext http)
    {
        var request = http.Request;
        var contact = request.Path.Equals("/api/public/contact", StringComparison.OrdinalIgnoreCase) && HttpMethods.IsPost(request.Method);
        var guarded = contact || request.Path.StartsWithSegments("/api/admin", StringComparison.OrdinalIgnoreCase) ||
                      request.Path.StartsWithSegments("/admin", StringComparison.OrdinalIgnoreCase);
        if (!guarded || HttpMethods.IsGet(request.Method) || HttpMethods.IsHead(request.Method) || HttpMethods.IsOptions(request.Method))
            return next(http);

        if (contact)
        {
            const long maxBytes = 24 * 1024;
            var bodyLimit = http.Features.Get<IHttpMaxRequestBodySizeFeature>();
            if (bodyLimit is { IsReadOnly: false }) bodyLimit.MaxRequestBodySize = maxBytes;
            if (request.ContentLength is > maxBytes)
            {
                http.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
                return Task.CompletedTask;
            }
        }

        var sameOrigin =
            request.Headers["Sec-Fetch-Site"].ToString() == "same-origin" ||
            string.Equals(request.Headers.Origin.ToString(), site.BaseUrl, StringComparison.OrdinalIgnoreCase);
        if (sameOrigin) return next(http);

        http.Response.StatusCode = StatusCodes.Status403Forbidden;
        http.Response.ContentType = "application/problem+json";
        return http.Response.WriteAsync("{\"status\":403,\"title\":\"cross-site request refused\"}");
    }
}
