using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Profile.Api.Admin.Access;

/// <summary>
/// Ported from the control panel (selfhost/apps/control/.../CloudflareAccess.cs).
/// The signed JWT, never the plain Cf-Access-Authenticated-User-Email header,
/// which anything reaching the origin could set. Checked on every request:
/// RS256 signature against Cloudflare's keys, issuer, this app's audience,
/// expiry, and the email allow-list.
/// </summary>
public sealed class AccessAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder,
    IOptions<AccessOptions> access, IAccessKeySource keySource)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Scheme = "CloudflareAccess";
    private const string HeaderName = "Cf-Access-Jwt-Assertion";
    private const string CookieName = "CF_Authorization";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var token = Request.Headers[HeaderName].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(token)) Request.Cookies.TryGetValue(CookieName, out token);
        if (string.IsNullOrWhiteSpace(token)) return AuthenticateResult.NoResult();

        IReadOnlyCollection<SecurityKey> keys;
        try
        {
            keys = await keySource.GetKeysAsync(Context.RequestAborted);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "could not fetch Cloudflare Access signing keys");
            return AuthenticateResult.Fail("cannot verify the token right now");
        }

        var a = access.Value;
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://{a.TeamDomain}",
            ValidateAudience = true,
            ValidAudience = a.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = keys,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
        };

        ClaimsPrincipal principal;
        try
        {
            principal = new JwtSecurityTokenHandler { MapInboundClaims = false }.ValidateToken(token, parameters, out _);
        }
        catch (Exception ex) // fail closed on anything the validator throws
        {
            Logger.LogWarning("rejected an Access token: {Reason}", ex.GetType().Name);
            return AuthenticateResult.Fail("invalid Access token");
        }

        var email = principal.FindFirst("email")?.Value;
        if (string.IsNullOrWhiteSpace(email)) return AuthenticateResult.Fail("token carries no email");

        if (!a.Emails.Any(e => string.Equals(e, email, StringComparison.OrdinalIgnoreCase)))
        {
            Logger.LogWarning("an email passed Access but is not on the admin allow-list");
            return AuthenticateResult.Fail("not permitted");
        }

        var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, email), new Claim(ClaimTypes.Email, email)], Scheme);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        Response.Headers.CacheControl = "no-store";
        if (Request.Path.StartsWithSegments("/api"))
        {
            Response.ContentType = "application/json";
            return Response.WriteAsync("{\"error\":\"not signed in\"}");
        }
        Response.ContentType = "text/html; charset=utf-8";
        return Response.WriteAsync(
            "<!doctype html><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex\"><title>Not signed in</title>" +
            "<p>This area is protected by Cloudflare Access. Open it at its public address.</p>");
    }

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties) => HandleChallengeAsync(properties);
}
