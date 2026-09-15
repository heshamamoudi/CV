using Profile.Api.Seo;

namespace Profile.Api.Admin.Access;

/// <summary>
/// The Access cookie is sent by the browser on any request to this site, so a
/// hostile page could otherwise make the owner's browser change content. Every
/// write must prove it came from this origin.
/// </summary>
public sealed class SameOriginFilter(SiteOptions site) : IEndpointFilter
{
    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var request = context.HttpContext.Request;
        if (HttpMethods.IsGet(request.Method) || HttpMethods.IsHead(request.Method)) return next(context);

        var sameOrigin =
            request.Headers["Sec-Fetch-Site"].ToString() == "same-origin" ||
            string.Equals(request.Headers.Origin.ToString(), site.BaseUrl, StringComparison.OrdinalIgnoreCase);

        return sameOrigin
            ? next(context)
            : ValueTask.FromResult<object?>(Results.Problem(statusCode: StatusCodes.Status403Forbidden, title: "cross-site request refused"));
    }
}
