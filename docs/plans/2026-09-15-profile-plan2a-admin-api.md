# heshamamoudi.com — Plan 2a: Admin backend (Access auth, admin API, media, CV, SEO)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything the admin screens (Plan 2b) need on the server — Cloudflare Access verification on every admin request, a JSON admin API to edit all content in both languages, image and CV uploads served back to the public site, SEO overrides and site settings wired into the rendered pages, and a completeness report.

**Architecture:** An authentication handler ported from the control panel validates the `Cf-Access-Jwt-Assertion` JWT (signature against Cloudflare's keys behind an `IAccessKeySource`, issuer, audience, expiry, RS256 only) plus an email allow-list. `/api/admin/*` and `/admin/*` require it; unsafe methods additionally require a same-origin request. Admin endpoints edit the existing EF model plus new `Media`, `CvFile`, `PageSeo`, `SiteSettings` and `ProjectSlugRedirect` tables. Images are resized to WebP **in the browser** (Plan 2b) and the server only verifies signature bytes and size — it never decodes an image.

**Tech Stack:** as Plan 1, plus `System.IdentityModel.Tokens.Jwt` 8.22.0 (OSV: no advisories).

**Spec:** `docs/2026-09-15-profile-design.md` §5.1–5.3, §4.2 (slug 301s, Search Console, share image). **Previous plan:** `docs/plans/2026-09-15-profile.md`.

## Decisions taken in this plan

- **No server-side image processing** (spec §2.1 named SkiaSharp). The admin browser resizes to 640/1280/1920 px WebP (JPEG where the browser cannot encode WebP). The server checks magic bytes and size only. Reason: image decoders are a recurring vulnerability source; this keeps the container at 0 known vulnerabilities (Plan 1 scan) and needs no native libraries on the distroless base.
- **Admin identity comes only from Cloudflare Access.** No dev bypass: tests sign their own tokens with a test key.

## Global Constraints

- Everything in Plan 1's Global Constraints still applies.
- Required at startup (fail fast, naming the variable): `CloudflareAccess__TeamDomain`, `CloudflareAccess__Audience`, `CloudflareAccess__AllowedEmails`.
- Live values are set in the control panel only (the AUD tag comes from the Access application "Portfolio admin"); this public repository carries none of them.
- JWT: RS256 only, issuer `https://{TeamDomain}`, audience exact, expiry required, clock skew 30 s, keys from `https://{TeamDomain}/cdn-cgi/access/certs` cached 30 min.
- Every `/api/admin/*` POST/PUT/DELETE must have `Sec-Fetch-Site: same-origin` or `Origin` equal to `Site__BaseUrl`; otherwise 403.
- Upload limits: image rendition ≤ 3 MB each, accepted signatures WebP (`RIFF....WEBP`) or JPEG (`FF D8 FF`) only — never SVG/PNG/GIF; CV PDF ≤ 10 MB with `%PDF-` signature.
- Public media URL: `/media/{id:N}/{width}.{webp|jpg}`, `Cache-Control: public, max-age=31536000, immutable`.
- Admin HTML responses: `Cache-Control: no-store` and `noindex`.

---

### Task 1: Cloudflare Access authentication

**Files:**
- Modify: `api/Profile.Api/Profile.Api.csproj`, `api/Profile.Api/Program.cs`, `tests/Profile.Api.Tests/TestApp.cs`, `tests/Profile.Api.Tests/HealthTests.cs`, `.env.example`
- Create: `api/Profile.Api/Admin/Access/AccessOptions.cs`, `api/Profile.Api/Admin/Access/AccessKeySource.cs`, `api/Profile.Api/Admin/Access/AccessAuthenticationHandler.cs`, `api/Profile.Api/Admin/Access/SameOriginFilter.cs`, `api/Profile.Api/Admin/AdminApi.cs`, `tests/Profile.Api.Tests/AccessTokens.cs`, `tests/Profile.Api.Tests/AccessTests.cs`

**Interfaces:**
- Produces: `AccessOptions { TeamDomain, Audience, AllowedEmails; IReadOnlyList<string> Emails }`; `IAccessKeySource.GetKeysAsync(CancellationToken)`; scheme name `AccessAuthenticationHandler.Scheme` = `"CloudflareAccess"`; policy `"admin"`; `AdminApi.MapAdmin(WebApplication)` returning the `/api/admin` `RouteGroupBuilder` for later tasks via `AdminApi.Group`; `GET /api/admin/me` → `{ "email": "..." }`; tests: `AccessTokens.Create(...)`, `AccessTokens.AdminClient(WebApplicationFactory<Program>)`.

- [ ] **Step 1: Add the package and restore**

In `api/Profile.Api/Profile.Api.csproj`, inside the first package `<ItemGroup>` add:
```xml
    <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="8.22.0" />
```
Run: `MSYS_NO_PATHCONV=1 docker run --rm --memory 4g -v "D:/cv:/src" -w /src mcr.microsoft.com/dotnet/sdk:8.0 dotnet restore api/Profile.Api --force-evaluate`
Expected: restore succeeds and `api/Profile.Api/packages.lock.json` changes.

- [ ] **Step 2: Test helpers**

`tests/Profile.Api.Tests/AccessTokens.cs`:
```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.IdentityModel.Tokens;
using Profile.Api.Admin.Access;

namespace Profile.Api.Tests;

/// <summary>Signs Access-shaped tokens with a test key the app is told to trust.</summary>
public static class AccessTokens
{
    public const string Team = "fikrahaive.cloudflareaccess.com";
    public const string Audience = "test-audience";
    public const string Email = "owner@example.com";

    public static readonly RsaSecurityKey Key = new(RSA.Create(2048)) { KeyId = "test-key" };

    public static string Create(
        string? audience = Audience, string? issuer = null, string? email = Email,
        DateTime? expires = null, SecurityKey? signWith = null)
    {
        var claims = new List<Claim> { new("sub", "test-subject") };
        if (email is not null) claims.Add(new Claim("email", email));
        var exp = expires ?? DateTime.UtcNow.AddHours(1);

        return new JwtSecurityTokenHandler().CreateEncodedJwt(
            issuer ?? $"https://{Team}",
            audience,
            new ClaimsIdentity(claims),
            notBefore: exp.AddHours(-2),
            expires: exp,
            issuedAt: exp.AddHours(-2),
            new SigningCredentials(signWith ?? Key, SecurityAlgorithms.RsaSha256));
    }

    /// <summary>A token whose header says alg "none" and carries no signature.</summary>
    public static string Unsigned()
    {
        static string B64(string s) => Base64UrlEncoder.Encode(Encoding.UTF8.GetBytes(s));
        var exp = DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds();
        return B64("{\"alg\":\"none\",\"typ\":\"JWT\"}") + "." +
               B64($"{{\"iss\":\"https://{Team}\",\"aud\":\"{Audience}\",\"email\":\"{Email}\",\"exp\":{exp}}}") + ".";
    }

    /// <summary>A client that is signed in and makes same-origin requests.</summary>
    public static HttpClient AdminClient(WebApplicationFactory<Program> app)
    {
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Add("Cf-Access-Jwt-Assertion", Create());
        client.DefaultRequestHeaders.Add("Origin", TestApp.BaseUrl);
        return client;
    }
}

public sealed class FakeKeySource : IAccessKeySource
{
    public Task<IReadOnlyCollection<SecurityKey>> GetKeysAsync(CancellationToken ct) =>
        Task.FromResult<IReadOnlyCollection<SecurityKey>>([AccessTokens.Key]);
}
```

Replace `tests/Profile.Api.Tests/TestApp.cs` with:
```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Profile.Api.Admin.Access;

namespace Profile.Api.Tests;

/// <summary>A test host with valid configuration, no startup migration, and a trusted test signing key.</summary>
public static class TestApp
{
    public const string BaseUrl = "https://heshamamoudi.com";

    public static WebApplicationFactory<Program> Create(Action<IServiceCollection>? services = null) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseSetting("ConnectionStrings:DefaultConnection", "Host=x;Database=x;Username=x;Password=x");
            b.UseSetting("Site:BaseUrl", BaseUrl);
            b.UseSetting("Startup:Migrate", "false");
            b.UseSetting("CloudflareAccess:TeamDomain", AccessTokens.Team);
            b.UseSetting("CloudflareAccess:Audience", AccessTokens.Audience);
            b.UseSetting("CloudflareAccess:AllowedEmails", AccessTokens.Email);
            b.ConfigureServices(s =>
            {
                s.AddSingleton<IAccessKeySource, FakeKeySource>();
                services?.Invoke(s);
            });
        });
}
```

In `tests/Profile.Api.Tests/HealthTests.cs`, add three rows to the `A_missing_setting_names_its_variable` theory:
```csharp
    [InlineData("CloudflareAccess:TeamDomain", "CloudflareAccess__TeamDomain")]
    [InlineData("CloudflareAccess:Audience", "CloudflareAccess__Audience")]
    [InlineData("CloudflareAccess:AllowedEmails", "CloudflareAccess__AllowedEmails")]
```

- [ ] **Step 3: Write the failing tests**

`tests/Profile.Api.Tests/AccessTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace Profile.Api.Tests;

public class AccessTests
{
    private static async Task<HttpResponseMessage> MeAsync(string? token, bool asCookie = false)
    {
        using var app = TestApp.Create(s => InMemoryDb.Use(s, "access-" + Guid.NewGuid()));
        var client = app.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/admin/me");
        if (token is not null)
        {
            if (asCookie) request.Headers.Add("Cookie", "CF_Authorization=" + token);
            else request.Headers.Add("Cf-Access-Jwt-Assertion", token);
        }
        return await client.SendAsync(request);
    }

    [Fact]
    public async Task A_valid_token_signs_in_the_allowed_email()
    {
        var reply = await MeAsync(AccessTokens.Create());

        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        Assert.Equal(AccessTokens.Email, (await reply.Content.ReadFromJsonAsync<Dictionary<string, string>>())!["email"]);
    }

    [Fact]
    public async Task The_access_cookie_works_like_the_header()
    {
        Assert.Equal(HttpStatusCode.OK, (await MeAsync(AccessTokens.Create(), asCookie: true)).StatusCode);
    }

    public static TheoryData<string, string?> Refused => new()
    {
        { "no token", null },
        { "not a jwt", "garbage" },
        { "alg none", AccessTokens.Unsigned() },
        { "wrong audience (another Access app)", AccessTokens.Create(audience: "control-panel-aud") },
        { "wrong issuer (another team)", AccessTokens.Create(issuer: "https://evil.cloudflareaccess.com") },
        { "expired", AccessTokens.Create(expires: DateTime.UtcNow.AddMinutes(-5)) },
        { "signed by another key", AccessTokens.Create(signWith: new RsaSecurityKey(RSA.Create(2048)) { KeyId = "other" }) },
        { "no email claim", AccessTokens.Create(email: null) },
        { "email not on the allow-list", AccessTokens.Create(email: "someone@else.com") },
    };

    [Theory]
    [MemberData(nameof(Refused))]
    public async Task Everything_else_is_refused(string why, string? token)
    {
        var reply = await MeAsync(token);
        Assert.True(reply.StatusCode == HttpStatusCode.Unauthorized, $"{why}: got {(int)reply.StatusCode}");
    }

    [Fact]
    public async Task A_signed_in_cross_site_write_is_refused_and_a_same_origin_one_is_not()
    {
        using var app = TestApp.Create(s => InMemoryDb.Use(s, "origin-" + Guid.NewGuid()));
        var client = app.CreateClient();

        HttpRequestMessage Post(string? origin, string? fetchSite)
        {
            var r = new HttpRequestMessage(HttpMethod.Post, "/api/admin/me/ping");
            r.Headers.Add("Cf-Access-Jwt-Assertion", AccessTokens.Create());
            if (origin is not null) r.Headers.Add("Origin", origin);
            if (fetchSite is not null) r.Headers.Add("Sec-Fetch-Site", fetchSite);
            return r;
        }

        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(Post("https://evil.example", "cross-site"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(Post(null, null))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(Post(TestApp.BaseUrl, null))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(Post(null, "same-origin"))).StatusCode);
    }

    [Fact]
    public async Task Public_pages_need_no_sign_in()
    {
        using var app = TestApp.Create(s => InMemoryDb.Use(s, "public-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        Assert.Equal(HttpStatusCode.OK, (await app.CreateClient().GetAsync("/en")).StatusCode);
    }
}
```

- [ ] **Step 4: Run to verify they fail**

Run: `MSYS_NO_PATHCONV=1 docker run --rm --memory 4g -v "D:/cv:/src" -w /src mcr.microsoft.com/dotnet/sdk:8.0 dotnet test tests/Profile.Api.Tests --nologo -v minimal`
Expected: build FAILS — `The type or namespace name 'Admin' does not exist`.

- [ ] **Step 5: Implement**

`api/Profile.Api/Admin/Access/AccessOptions.cs`:
```csharp
namespace Profile.Api.Admin.Access;

public sealed class AccessOptions
{
    /// <summary>e.g. fikrahaive.cloudflareaccess.com</summary>
    public string TeamDomain { get; set; } = "";

    /// <summary>The Access application's AUD tag - identifies THIS app, so a token for the control panel is refused here.</summary>
    public string Audience { get; set; } = "";

    /// <summary>Comma-separated. Access decides who reaches /admin; this decides who may use it.</summary>
    public string AllowedEmails { get; set; } = "";

    public IReadOnlyList<string> Emails =>
        AllowedEmails.Split([',', ';', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
```

`api/Profile.Api/Admin/Access/AccessKeySource.cs`:
```csharp
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Profile.Api.Admin.Access;

/// <summary>Cloudflare's current signing keys. An interface so tests can trust their own key.</summary>
public interface IAccessKeySource
{
    Task<IReadOnlyCollection<SecurityKey>> GetKeysAsync(CancellationToken ct);
}

/// <summary>Cloudflare rotates keys, so they are cached briefly and refetched.</summary>
public sealed class CloudflareAccessKeySource(IHttpClientFactory http, IOptions<AccessOptions> options, ILogger<CloudflareAccessKeySource> log)
    : IAccessKeySource
{
    private readonly SemaphoreSlim _lock = new(1, 1);
    private IReadOnlyCollection<SecurityKey>? _keys;
    private DateTimeOffset _fetchedAt = DateTimeOffset.MinValue;

    public async Task<IReadOnlyCollection<SecurityKey>> GetKeysAsync(CancellationToken ct)
    {
        if (_keys is not null && DateTimeOffset.UtcNow - _fetchedAt < TimeSpan.FromMinutes(30)) return _keys;

        await _lock.WaitAsync(ct);
        try
        {
            if (_keys is not null && DateTimeOffset.UtcNow - _fetchedAt < TimeSpan.FromMinutes(30)) return _keys;

            var client = http.CreateClient("cf-access");
            client.Timeout = TimeSpan.FromSeconds(15);
            var json = await client.GetStringAsync($"https://{options.Value.TeamDomain}/cdn-cgi/access/certs", ct);
            _keys = new JsonWebKeySet(json).GetSigningKeys().ToList();
            _fetchedAt = DateTimeOffset.UtcNow;
            log.LogInformation("loaded {Count} Cloudflare Access signing keys", _keys.Count);
            return _keys;
        }
        finally
        {
            _lock.Release();
        }
    }
}
```

`api/Profile.Api/Admin/Access/AccessAuthenticationHandler.cs`:
```csharp
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
```

`api/Profile.Api/Admin/Access/SameOriginFilter.cs`:
```csharp
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
```

`api/Profile.Api/Admin/AdminApi.cs`:
```csharp
using System.Security.Claims;
using Profile.Api.Admin.Access;

namespace Profile.Api.Admin;

public static class AdminApi
{
    public static RouteGroupBuilder MapAdmin(this WebApplication app)
    {
        var admin = app.MapGroup("/api/admin")
            .RequireAuthorization("admin")
            .AddEndpointFilter<SameOriginFilter>();

        admin.MapGet("/me", (ClaimsPrincipal user) => Results.Ok(new { email = user.FindFirstValue(ClaimTypes.Email) }));
        // A write with no side effect, so the same-origin rule has something to be tested against.
        admin.MapPost("/me/ping", () => Results.Ok(new { ok = true }));

        return admin;
    }
}
```

Modify `api/Profile.Api/Program.cs`:
- after `var baseUrl = Required(...)` add:
```csharp
_ = Required("CloudflareAccess:TeamDomain", "CloudflareAccess__TeamDomain");
_ = Required("CloudflareAccess:Audience", "CloudflareAccess__Audience");
_ = Required("CloudflareAccess:AllowedEmails", "CloudflareAccess__AllowedEmails");
```
- before `builder.WebHost.ConfigureKestrel(...)` add:
```csharp
builder.Services.Configure<Profile.Api.Admin.Access.AccessOptions>(builder.Configuration.GetSection("CloudflareAccess"));
builder.Services.AddHttpClient();
builder.Services.AddSingleton<Profile.Api.Admin.Access.IAccessKeySource, Profile.Api.Admin.Access.CloudflareAccessKeySource>();
builder.Services.AddAuthentication(Profile.Api.Admin.Access.AccessAuthenticationHandler.Scheme)
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, Profile.Api.Admin.Access.AccessAuthenticationHandler>(
        Profile.Api.Admin.Access.AccessAuthenticationHandler.Scheme, _ => { });
builder.Services.AddAuthorization(o => o.AddPolicy("admin", p => p.RequireAuthenticatedUser()));
builder.Services.AddSingleton<Profile.Api.Admin.Access.SameOriginFilter>();
```
- after `app.UseStaticFiles(...)` block add:
```csharp
app.UseAuthentication();
app.UseAuthorization();
```
- before `Profile.Api.Content.PublicApi.MapPublicApi(app);` add:
```csharp
Profile.Api.Admin.AdminApi.MapAdmin(app);
```

Append to `.env.example`:
```
# Cloudflare Access application "Portfolio admin" (Zero Trust -> Access -> Applications).
CloudflareAccess__TeamDomain=fikrahaive.cloudflareaccess.com
CloudflareAccess__Audience=
# Comma-separated addresses allowed to use /admin.
CloudflareAccess__AllowedEmails=
```

- [ ] **Step 6: Run the tests**

Run the API test command. Expected: 0 failed; 45 before + 3 health rows + 13 access cases (2 accepted, 9 refused, 1 origin, 1 public) = **61**.

- [ ] **Step 7: Mutation checks**

For each mutation below, change the line in `AccessAuthenticationHandler.cs`, run `--filter "FullyQualifiedName~AccessTests"`, confirm at least one FAIL, restore:
1. `ValidAudience = a.Audience,` → `ValidateAudience = false,`
2. `ValidAlgorithms = [SecurityAlgorithms.RsaSha256],` → delete the line and set `RequireSignedTokens = false`
3. the `if (!a.Emails.Any(...))` block → delete it
4. in `SameOriginFilter.cs`, return `next(context)` unconditionally

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Admin sign-in: Cloudflare Access JWT on every request, same-origin writes"
```

---

### Task 2: Data model for media, CV files, SEO, settings and slug history

**Files:**
- Modify: `api/Profile.Api/Data/Entities.cs`, `api/Profile.Api/Data/ProfileContext.cs`
- Create: `api/Profile.Api/Data/AdminEntities.cs`, `api/Profile.Api/Data/Migrations/*_Admin*` (generated)
- Test: `tests/Profile.Api.Tests/AdminModelTests.cs`

**Interfaces:**
- Produces: `IOrdered { int Id { get; } int SortOrder { get; set; } }` implemented by `JourneyEntry, Project, Technology, Certificate, Education, SpokenLanguage`; `ProfileRecord.HeroMediaId`, `ProfileRecord.PortraitMediaId`, `Project.CoverMediaId` (`Guid?`); entities `Media { Guid Id; string FileName; LocalizedText Alt; int Width; int Height; DateTimeOffset CreatedAt; List<MediaRendition> Renditions }`, `MediaRendition { int Id; Guid MediaId; int Width; string ContentType; byte[] Bytes; string Sha256 }`, `CvFile { string Lang (PK); string FileName; byte[] Bytes; string Sha256; DateTimeOffset UploadedAt }`, `PageSeo { string Key (PK); LocalizedText Title; LocalizedText Description; Guid? ShareMediaId }`, `SiteSettings { int Id = 1; string GaMeasurementId; string GaPropertyId; string SearchConsoleToken; string NotificationEmail; int MessageRetentionDays = 180 }`, `ProjectSlugRedirect { string OldSlug (PK); int ProjectId }`; `DbSet`s `Media, MediaRenditions, CvFiles, PageSeo, SiteSettings, ProjectSlugRedirects`.

- [ ] **Step 1: Write the failing test**

`tests/Profile.Api.Tests/AdminModelTests.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class AdminModelTests
{
    [Fact]
    public async Task Media_with_renditions_cv_files_seo_and_settings_round_trip()
    {
        var options = new DbContextOptionsBuilder<ProfileContext>().UseInMemoryDatabase("model-" + Guid.NewGuid()).Options;
        var id = Guid.NewGuid();

        await using (var db = new ProfileContext(options))
        {
            db.Media.Add(new Media
            {
                Id = id, FileName = "hero.webp", Width = 1920, Height = 1080, Alt = LocalizedText.Of("Riyadh", "الرياض"),
                Renditions = [new MediaRendition { Width = 640, ContentType = "image/webp", Bytes = [1, 2, 3], Sha256 = "abc" }],
            });
            db.CvFiles.Add(new CvFile { Lang = "en", FileName = "cv.pdf", Bytes = [37, 80, 68, 70], Sha256 = "def" });
            db.PageSeo.Add(new PageSeo { Key = "home", Title = LocalizedText.Of("T", "ع"), Description = new(), ShareMediaId = id });
            db.SiteSettings.Add(new SiteSettings { GaMeasurementId = "G-TEST1234" });
            db.ProjectSlugRedirects.Add(new ProjectSlugRedirect { OldSlug = "old", ProjectId = 1 });
            await db.SaveChangesAsync();
        }

        await using (var db = new ProfileContext(options))
        {
            var media = await db.Media.Include(m => m.Renditions).SingleAsync();
            Assert.Equal("الرياض", media.Alt.Ar);
            Assert.Single(media.Renditions);
            Assert.Equal("cv.pdf", (await db.CvFiles.SingleAsync(c => c.Lang == "en")).FileName);
            Assert.Equal(id, (await db.PageSeo.SingleAsync()).ShareMediaId);
            Assert.Equal(180, (await db.SiteSettings.SingleAsync()).MessageRetentionDays);
            Assert.Equal(1, (await db.ProjectSlugRedirects.SingleAsync()).ProjectId);
        }
    }

    [Fact]
    public void Ordered_content_shares_one_ordering_contract()
    {
        Assert.All(new[] { typeof(JourneyEntry), typeof(Project), typeof(Technology), typeof(Certificate), typeof(Education), typeof(SpokenLanguage) },
            t => Assert.True(typeof(IOrdered).IsAssignableFrom(t), t.Name));
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run the API test command. Expected: build FAILS — `'ProfileContext' does not contain a definition for 'Media'`.

- [ ] **Step 3: Implement**

`api/Profile.Api/Data/AdminEntities.cs`:
```csharp
namespace Profile.Api.Data;

/// <summary>Content with an explicit position the owner controls.</summary>
public interface IOrdered
{
    int Id { get; }
    int SortOrder { get; set; }
}

/// <summary>An uploaded image. The browser resized it; each width is a rendition.</summary>
public sealed class Media
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FileName { get; set; } = "";
    public LocalizedText Alt { get; set; } = new();
    public int Width { get; set; }
    public int Height { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public List<MediaRendition> Renditions { get; set; } = [];
}

public sealed class MediaRendition
{
    public int Id { get; set; }
    public Guid MediaId { get; set; }
    public int Width { get; set; }
    public string ContentType { get; set; } = "";
    public byte[] Bytes { get; set; } = [];
    public string Sha256 { get; set; } = "";
}

/// <summary>The downloadable CV, one per language.</summary>
public sealed class CvFile
{
    public string Lang { get; set; } = "";
    public string FileName { get; set; } = "";
    public byte[] Bytes { get; set; } = [];
    public string Sha256 { get; set; } = "";
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Title/description/share image overrides for home, journey and projects.</summary>
public sealed class PageSeo
{
    public string Key { get; set; } = "";
    public LocalizedText Title { get; set; } = new();
    public LocalizedText Description { get; set; } = new();
    public Guid? ShareMediaId { get; set; }
}

public sealed class SiteSettings
{
    public int Id { get; set; } = 1;
    public string GaMeasurementId { get; set; } = "";
    public string GaPropertyId { get; set; } = "";
    public string SearchConsoleToken { get; set; } = "";
    public string NotificationEmail { get; set; } = "";
    public int MessageRetentionDays { get; set; } = 180;
}

/// <summary>A project's previous slug, so old links 301 to the current one.</summary>
public sealed class ProjectSlugRedirect
{
    public string OldSlug { get; set; } = "";
    public int ProjectId { get; set; }
}
```

In `api/Profile.Api/Data/Entities.cs`:
- `ProfileRecord`: add after `GitHubUrl`:
```csharp
    public Guid? HeroMediaId { get; set; }
    public Guid? PortraitMediaId { get; set; }
```
- change `public sealed class JourneyEntry` → `public sealed class JourneyEntry : IOrdered`; likewise `Project`, `Technology`, `Certificate`, `Education`, `SpokenLanguage`.
- `Project`: add after `Technologies`:
```csharp
    public Guid? CoverMediaId { get; set; }
```

In `api/Profile.Api/Data/ProfileContext.cs` add the sets after `SpokenLanguages`:
```csharp
    public DbSet<Media> Media => Set<Media>();
    public DbSet<MediaRendition> MediaRenditions => Set<MediaRendition>();
    public DbSet<CvFile> CvFiles => Set<CvFile>();
    public DbSet<PageSeo> PageSeo => Set<PageSeo>();
    public DbSet<SiteSettings> SiteSettings => Set<SiteSettings>();
    public DbSet<ProjectSlugRedirect> ProjectSlugRedirects => Set<ProjectSlugRedirect>();
```
and at the end of `OnModelCreating` (before its closing brace):
```csharp
        b.Entity<Media>(e =>
        {
            Text(e, x => x.Alt);
            e.HasMany(x => x.Renditions).WithOne().HasForeignKey(r => r.MediaId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<MediaRendition>(e => e.HasIndex(x => new { x.MediaId, x.Width }).IsUnique());
        b.Entity<CvFile>(e => e.HasKey(x => x.Lang));
        b.Entity<PageSeo>(e => { e.HasKey(x => x.Key); Text(e, x => x.Title); Text(e, x => x.Description); });
        b.Entity<SiteSettings>(e => e.Property(x => x.Id).ValueGeneratedNever());
        b.Entity<ProjectSlugRedirect>(e => e.HasKey(x => x.OldSlug));
```

- [ ] **Step 4: Run the tests, then generate the migration**

Run the API test command. Expected: all pass (previous total + 2).

```bash
MSYS_NO_PATHCONV=1 docker run --rm --memory 4g -v "D:/cv:/src" -w /src mcr.microsoft.com/dotnet/sdk:8.0 sh -c \
  "dotnet tool install --tool-path /tmp/ef dotnet-ef --version 8.0.11 >/dev/null && \
   /tmp/ef/dotnet-ef migrations add Admin --project api/Profile.Api --output-dir Data/Migrations"
grep -oE 'name: "(Media|MediaRenditions|CvFiles|PageSeo|SiteSettings|ProjectSlugRedirects)"' api/Profile.Api/Data/Migrations/*_Admin.cs | sort -u
grep -c "HeroMediaId\|PortraitMediaId\|CoverMediaId" api/Profile.Api/Data/Migrations/*_Admin.cs
```
Expected: all six table names; at least 3 new columns.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Model for media renditions, CV files, page SEO, settings and slug history"
```

---

### Task 3: Validation helper, ordered CRUD, and the profile endpoint

**Files:**
- Create: `api/Profile.Api/Admin/Problems.cs`, `api/Profile.Api/Admin/OrderedCrud.cs`, `api/Profile.Api/Admin/ProfileAdmin.cs`, `tests/Profile.Api.Tests/AdminTestApp.cs`, `tests/Profile.Api.Tests/ProfileAdminTests.cs`
- Modify: `api/Profile.Api/Admin/AdminApi.cs`

**Interfaces:**
- Consumes: `ProfileContext`, `LocalizedText`, `IOrdered`, `ContentService.SafeHttpUrl`.
- Produces:
  - `Problems` with `Add(field, message)`, `Text(field, LocalizedText?, int max)`, `HttpUrl(field, string)`, `Email(field, string)`, `bool Any`, `IResult Result()`
  - `OrderedCrud.Map<TEntity, TEdit>(RouteGroupBuilder group, string path, Func<ProfileContext, IQueryable<TEntity>> query, Func<ProfileContext, TEdit, TEntity?, Task<Problems>> validate, Func<ProfileContext, TEdit, TEntity, Task> apply, Func<TEntity, object> view) where TEntity : class, IOrdered, new()` → `GET path`, `POST path`, `PUT path/{id:int}`, `DELETE path/{id:int}`, `PUT path/order` (body `int[]` of every id)
  - `GET/PUT /api/admin/profile` with `ProfileEdit(LocalizedText Name, LocalizedText Headline, LocalizedText Eyebrow, LocalizedText HeroTitle, LocalizedText HeroSubtitle, LocalizedText Summary, LocalizedText Location, LocalizedText About, LocalizedText Quote, string Email, string LinkedInUrl, string GitHubUrl, Guid? HeroMediaId, Guid? PortraitMediaId)`
  - tests: `AdminTestApp.CreateAsync()` → `(WebApplicationFactory<Program> App, HttpClient Admin)` with seeded in-memory data

- [ ] **Step 1: Write the failing tests**

`tests/Profile.Api.Tests/AdminTestApp.cs`:
```csharp
using Microsoft.AspNetCore.Mvc.Testing;

namespace Profile.Api.Tests;

public static class AdminTestApp
{
    public static async Task<(WebApplicationFactory<Program> App, HttpClient Admin)> CreateAsync()
    {
        var app = TestApp.Create(s => InMemoryDb.Use(s, "admin-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        return (app, AccessTokens.AdminClient(app));
    }
}
```

`tests/Profile.Api.Tests/ProfileAdminTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Profile.Api.Tests;

public class ProfileAdminTests
{
    [Fact]
    public async Task The_profile_is_read_edited_and_shown_on_the_public_page()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        Assert.Equal("هشام العمودي", profile["name"]!["ar"]!.GetValue<string>());

        profile["headline"]!["en"] = "Lead Engineer";
        var reply = await admin.PutAsJsonAsync("/api/admin/profile", profile);

        Assert.Equal(HttpStatusCode.NoContent, reply.StatusCode);
        Assert.Contains("Lead Engineer", await app.CreateClient().GetStringAsync("/en"));
    }

    [Fact]
    public async Task Invalid_values_are_refused_field_by_field_and_nothing_is_saved()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;

        profile["linkedInUrl"] = "javascript:alert(1)";
        profile["email"] = "not-an-email";
        profile["headline"]!["ar"] = new string('x', 201);
        profile["heroMediaId"] = Guid.NewGuid().ToString();
        var reply = await admin.PutAsJsonAsync("/api/admin/profile", profile);
        var problem = (await reply.Content.ReadFromJsonAsync<JsonObject>())!["errors"]!.AsObject();

        Assert.Equal(HttpStatusCode.BadRequest, reply.StatusCode);
        Assert.True(problem.ContainsKey("linkedInUrl"));
        Assert.True(problem.ContainsKey("email"));
        Assert.True(problem.ContainsKey("headline.ar"));
        Assert.True(problem.ContainsKey("heroMediaId"));
        Assert.DoesNotContain("javascript:", await app.CreateClient().GetStringAsync("/en"));
    }

    [Fact]
    public async Task Without_sign_in_the_profile_cannot_be_read()
    {
        var (app, _) = await AdminTestApp.CreateAsync();
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateClient().GetAsync("/api/admin/profile")).StatusCode);
    }
}
```

- [ ] **Step 2: Run to verify they fail**

Run the API test command. Expected: FAIL — `/api/admin/profile` returns 404.

- [ ] **Step 3: Implement**

`api/Profile.Api/Admin/Problems.cs`:
```csharp
using System.Net.Mail;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Admin;

/// <summary>Field-level validation errors, returned as an RFC 7807 validation problem.</summary>
public sealed class Problems
{
    private readonly Dictionary<string, List<string>> _errors = new();

    public bool Any => _errors.Count > 0;

    public Problems Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var list)) _errors[field] = list = [];
        list.Add(message);
        return this;
    }

    /// <summary>Both languages optional (drafts are allowed; completeness is reported separately), each bounded.</summary>
    public Problems Text(string field, LocalizedText? text, int max)
    {
        if (text is null) return Add(field, "required");
        if (text.En.Length > max) Add(field + ".en", $"at most {max} characters");
        if (text.Ar.Length > max) Add(field + ".ar", $"at most {max} characters");
        return this;
    }

    public Problems HttpUrl(string field, string? value)
    {
        if (value is null) return Add(field, "required");
        if (value.Length > 0 && ContentService.SafeHttpUrl(value).Length == 0) Add(field, "must be an http or https address");
        return this;
    }

    public Problems Email(string field, string? value)
    {
        if (value is null) return Add(field, "required");
        if (value.Length > 0 && (value.Length > 200 || !MailAddress.TryCreate(value, out _))) Add(field, "not a valid email address");
        return this;
    }

    public IResult Result() => Results.ValidationProblem(_errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));
}
```

`api/Profile.Api/Admin/OrderedCrud.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Admin;

/// <summary>List, create, update, delete and reorder for any content with an owner-controlled order.</summary>
public static class OrderedCrud
{
    public static void Map<TEntity, TEdit>(
        RouteGroupBuilder group, string path,
        Func<ProfileContext, IQueryable<TEntity>> query,
        Func<ProfileContext, TEdit, TEntity?, Task<Problems>> validate,
        Func<ProfileContext, TEdit, TEntity, Task> apply,
        Func<TEntity, object> view)
        where TEntity : class, IOrdered, new()
    {
        group.MapGet(path, async (ProfileContext db) =>
            Results.Ok((await query(db).OrderBy(e => e.SortOrder).ToListAsync()).Select(view)));

        group.MapPost(path, async (ProfileContext db, TEdit edit) =>
        {
            var problems = await validate(db, edit, null);
            if (problems.Any) return problems.Result();

            var entity = new TEntity();
            entity.SortOrder = await db.Set<TEntity>().AnyAsync() ? await db.Set<TEntity>().MaxAsync(e => e.SortOrder) + 1 : 0;
            await apply(db, edit, entity);
            db.Set<TEntity>().Add(entity);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin{path}/{entity.Id}", view(entity));
        });

        group.MapPut(path + "/{id:int}", async (ProfileContext db, int id, TEdit edit) =>
        {
            var entity = await query(db).FirstOrDefaultAsync(e => e.Id == id);
            if (entity is null) return Results.NotFound();

            var problems = await validate(db, edit, entity);
            if (problems.Any) return problems.Result();

            await apply(db, edit, entity);
            await db.SaveChangesAsync();
            return Results.Ok(view(entity));
        });

        group.MapDelete(path + "/{id:int}", async (ProfileContext db, int id) =>
        {
            var entity = await db.Set<TEntity>().FirstOrDefaultAsync(e => e.Id == id);
            if (entity is null) return Results.NotFound();
            db.Set<TEntity>().Remove(entity);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // The whole order at once: a partial list would leave positions ambiguous.
        group.MapPut(path + "/order", async (ProfileContext db, int[] ids) =>
        {
            var all = await db.Set<TEntity>().ToListAsync();
            if (ids.Length != all.Count || ids.Distinct().Count() != ids.Length || !all.All(e => ids.Contains(e.Id)))
                return new Problems().Add("ids", "must list every item exactly once").Result();

            foreach (var entity in all) entity.SortOrder = Array.IndexOf(ids, entity.Id);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
```

`api/Profile.Api/Admin/ProfileAdmin.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Admin;

public sealed record ProfileEdit(
    LocalizedText Name, LocalizedText Headline, LocalizedText Eyebrow, LocalizedText HeroTitle, LocalizedText HeroSubtitle,
    LocalizedText Summary, LocalizedText Location, LocalizedText About, LocalizedText Quote,
    string Email, string LinkedInUrl, string GitHubUrl, Guid? HeroMediaId, Guid? PortraitMediaId);

public static class ProfileAdmin
{
    public static void Map(RouteGroupBuilder admin)
    {
        admin.MapGet("/profile", async (ProfileContext db) =>
            await db.Profiles.AsNoTracking().OrderBy(p => p.Id).FirstOrDefaultAsync() is { } p
                ? Results.Ok(new ProfileEdit(p.Name, p.Headline, p.Eyebrow, p.HeroTitle, p.HeroSubtitle, p.Summary, p.Location,
                    p.About, p.Quote, p.Email, p.LinkedInUrl, p.GitHubUrl, p.HeroMediaId, p.PortraitMediaId))
                : Results.NotFound());

        admin.MapPut("/profile", async (ProfileContext db, ProfileEdit edit) =>
        {
            var problems = new Problems()
                .Text("name", edit.Name, 200).Text("headline", edit.Headline, 200).Text("eyebrow", edit.Eyebrow, 200)
                .Text("heroTitle", edit.HeroTitle, 300).Text("heroSubtitle", edit.HeroSubtitle, 600)
                .Text("summary", edit.Summary, 4000).Text("location", edit.Location, 200)
                .Text("about", edit.About, 4000).Text("quote", edit.Quote, 300)
                .Email("email", edit.Email).HttpUrl("linkedInUrl", edit.LinkedInUrl).HttpUrl("gitHubUrl", edit.GitHubUrl);
            await MediaExists(db, problems, "heroMediaId", edit.HeroMediaId);
            await MediaExists(db, problems, "portraitMediaId", edit.PortraitMediaId);
            if (problems.Any) return problems.Result();

            var p = await db.Profiles.OrderBy(x => x.Id).FirstAsync();
            p.Name = edit.Name; p.Headline = edit.Headline; p.Eyebrow = edit.Eyebrow;
            p.HeroTitle = edit.HeroTitle; p.HeroSubtitle = edit.HeroSubtitle; p.Summary = edit.Summary;
            p.Location = edit.Location; p.About = edit.About; p.Quote = edit.Quote;
            p.Email = edit.Email; p.LinkedInUrl = edit.LinkedInUrl; p.GitHubUrl = edit.GitHubUrl;
            p.HeroMediaId = edit.HeroMediaId; p.PortraitMediaId = edit.PortraitMediaId;
            p.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    internal static async Task MediaExists(ProfileContext db, Problems problems, string field, Guid? id)
    {
        if (id is { } value && !await db.Media.AnyAsync(m => m.Id == value)) problems.Add(field, "no such image");
    }
}
```

In `api/Profile.Api/Admin/AdminApi.cs`, before `return admin;` add:
```csharp
        ProfileAdmin.Map(admin);
```

- [ ] **Step 4: Run the tests**

Run the API test command. Expected: all pass (+3).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Admin profile endpoint with field-level validation"
```

---

### Task 4: Journey, projects (with slug history) and the four simple lists

**Files:**
- Create: `api/Profile.Api/Admin/ContentAdmin.cs`, `tests/Profile.Api.Tests/ContentAdminTests.cs`
- Modify: `api/Profile.Api/Admin/AdminApi.cs`, `api/Profile.Api/Content/ContentService.cs`, `api/Profile.Api/Seo/PageRoutes.cs`

**Interfaces:**
- Consumes: `OrderedCrud.Map`, `Problems`, `ProfileAdmin.MediaExists`.
- Produces:
  - `/api/admin/journey` — `JourneyEdit(LocalizedText Title, LocalizedText Organisation, LocalizedText Summary, List<LocalizedText> Highlights, DateOnly StartDate, DateOnly? EndDate, string Kind, int Seniority, bool Visible)`; view adds `Id`, `SortOrder`
  - `/api/admin/projects` — `ProjectEdit(string Slug, LocalizedText Title, LocalizedText Summary, LocalizedText Body, List<string> Technologies, bool Featured, bool Visible, Guid? CoverMediaId)`
  - `/api/admin/technologies` — `TechnologyEdit(string Name, LocalizedText Category)`
  - `/api/admin/certificates` — `CertificateEdit(LocalizedText Title, string Issuer, DateOnly IssuedOn)`
  - `/api/admin/education` — `EducationEdit(LocalizedText Degree, LocalizedText Institution)`
  - `/api/admin/languages` — `LanguageEdit(LocalizedText Name, LocalizedText Level)`
  - `ContentService.CurrentSlugAsync(string oldSlug, CancellationToken ct = default) : Task<string?>`
  - public: `GET /{lang}/projects/{oldSlug}` → 301 to the current slug

- [ ] **Step 1: Write the failing tests**

`tests/Profile.Api.Tests/ContentAdminTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Profile.Api.Tests;

public class ContentAdminTests
{
    private static JsonObject L(string en, string ar) => new() { ["en"] = en, ["ar"] = ar };

    [Fact]
    public async Task A_journey_entry_is_created_edited_reordered_and_deleted()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var body = new JsonObject
        {
            ["title"] = L("Senior Digital Compliance Specialist", "أخصائي أول الامتثال الرقمي"),
            ["organisation"] = L("GACA", "الهيئة العامة للطيران المدني"),
            ["summary"] = L("", ""),
            ["highlights"] = new JsonArray(L("Compliance", "الامتثال")),
            ["startDate"] = "2026-01-01", ["endDate"] = null, ["kind"] = "main", ["seniority"] = 5, ["visible"] = true,
        };

        var created = await admin.PostAsJsonAsync("/api/admin/journey", body);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();
        Assert.Contains("الهيئة العامة للطيران المدني", await app.CreateClient().GetStringAsync("/ar"));

        var list = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/journey"))!;
        var ids = list.Select(n => n!["id"]!.GetValue<int>()).ToList();
        ids.Remove(id); ids.Insert(0, id);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync("/api/admin/journey/order", ids)).StatusCode);
        Assert.Equal(id, (await admin.GetFromJsonAsync<JsonArray>("/api/admin/journey"))![0]!["id"]!.GetValue<int>());

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/journey/{id}")).StatusCode);
        Assert.DoesNotContain("GACA", await app.CreateClient().GetStringAsync("/en"));
    }

    [Fact]
    public async Task A_journey_entry_that_ends_before_it_starts_is_refused()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var body = new JsonObject
        {
            ["title"] = L("x", "x"), ["organisation"] = L("x", "x"), ["summary"] = L("", ""), ["highlights"] = new JsonArray(),
            ["startDate"] = "2026-01-01", ["endDate"] = "2025-01-01", ["kind"] = "sideways", ["seniority"] = 9, ["visible"] = true,
        };
        var reply = await admin.PostAsJsonAsync("/api/admin/journey", body);
        var errors = (await reply.Content.ReadFromJsonAsync<JsonObject>())!["errors"]!.AsObject();

        Assert.Equal(HttpStatusCode.BadRequest, reply.StatusCode);
        Assert.True(errors.ContainsKey("endDate"));
        Assert.True(errors.ContainsKey("kind"));
        Assert.True(errors.ContainsKey("seniority"));
    }

    [Fact]
    public async Task Reordering_with_a_partial_list_is_refused()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync("/api/admin/technologies/order", new[] { 1 })).StatusCode);
    }

    [Fact]
    public async Task Renaming_a_project_slug_keeps_old_links_working_with_a_301()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var project = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!
            .Single(p => p!["slug"]!.GetValue<string>() == "safety-management-system")!.AsObject();
        var id = project["id"]!.GetValue<int>();

        project["slug"] = "sms";
        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync($"/api/admin/projects/{id}", project)).StatusCode);

        var client = app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var old = await client.GetAsync("/ar/projects/safety-management-system");

        Assert.Equal(HttpStatusCode.MovedPermanently, old.StatusCode);
        Assert.Equal("/ar/projects/sms", old.Headers.Location!.OriginalString);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/ar/projects/sms")).StatusCode);
    }

    [Fact]
    public async Task Project_slugs_must_be_well_formed_and_unique()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var projects = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!;
        var first = projects[0]!.AsObject();
        var secondSlug = projects[1]!["slug"]!.GetValue<string>();

        first["slug"] = secondSlug;
        var duplicate = await admin.PutAsJsonAsync($"/api/admin/projects/{first["id"]}", first);
        first["slug"] = "Not A Slug!";
        var malformed = await admin.PutAsJsonAsync($"/api/admin/projects/{first["id"]}", first);

        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, malformed.StatusCode);
    }

    [Fact]
    public async Task Only_one_project_is_featured()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var projects = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!;
        foreach (var index in new[] { 0, 1 })
        {
            var p = projects[index]!.AsObject();
            p["featured"] = true;
            await admin.PutAsJsonAsync($"/api/admin/projects/{p["id"]}", p);
        }

        var after = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!;
        Assert.Single(after, p => p!["featured"]!.GetValue<bool>());
        Assert.True(after[1]!["featured"]!.GetValue<bool>());
    }

    [Fact]
    public async Task The_simple_lists_are_editable()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/technologies",
            new JsonObject { ["name"] = "Kubernetes", ["category"] = L("Cloud & DevOps", "السحابة وDevOps") })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/certificates",
            new JsonObject { ["title"] = L("CISA", "CISA"), ["issuer"] = "ISACA", ["issuedOn"] = "2026-05-01" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/education",
            new JsonObject { ["degree"] = L("MSc", "ماجستير"), ["institution"] = L("KAU", "جامعة الملك عبدالعزيز") })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/languages",
            new JsonObject { ["name"] = L("French", "الفرنسية"), ["level"] = L("Basic", "مبتدئ") })).StatusCode);

        var html = await app.CreateClient().GetStringAsync("/en");
        Assert.Contains("Kubernetes", html);
        Assert.Contains("CISA — ISACA", html);
        Assert.Contains("French — Basic", html);
    }
}
```

- [ ] **Step 2: Run to verify they fail**

Run the API test command. Expected: FAIL — admin content routes return 404.

- [ ] **Step 3: Implement**

`api/Profile.Api/Admin/ContentAdmin.cs`:
```csharp
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Admin;

public sealed record JourneyEdit(
    LocalizedText Title, LocalizedText Organisation, LocalizedText Summary, List<LocalizedText> Highlights,
    DateOnly StartDate, DateOnly? EndDate, string Kind, int Seniority, bool Visible);

public sealed record ProjectEdit(
    string Slug, LocalizedText Title, LocalizedText Summary, LocalizedText Body, List<string> Technologies,
    bool Featured, bool Visible, Guid? CoverMediaId);

public sealed record TechnologyEdit(string Name, LocalizedText Category);
public sealed record CertificateEdit(LocalizedText Title, string Issuer, DateOnly IssuedOn);
public sealed record EducationEdit(LocalizedText Degree, LocalizedText Institution);
public sealed record LanguageEdit(LocalizedText Name, LocalizedText Level);

public static partial class ContentAdmin
{
    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();

    public static void Map(RouteGroupBuilder admin)
    {
        OrderedCrud.Map<JourneyEntry, JourneyEdit>(admin, "/journey",
            db => db.JourneyEntries.Include(j => j.Highlights),
            (_, e, _) =>
            {
                var p = new Problems().Text("title", e.Title, 200).Text("organisation", e.Organisation, 200).Text("summary", e.Summary, 2000);
                if (e.Highlights is null) p.Add("highlights", "required");
                else
                {
                    if (e.Highlights.Count > 20) p.Add("highlights", "at most 20");
                    for (var i = 0; i < e.Highlights.Count; i++) p.Text($"highlights[{i}]", e.Highlights[i], 400);
                }
                if (e.EndDate is { } end && end < e.StartDate) p.Add("endDate", "cannot be before the start date");
                if (e.Kind is not ("main" or "additional")) p.Add("kind", "must be main or additional");
                if (e.Seniority is < 1 or > 5) p.Add("seniority", "must be 1 to 5");
                return Task.FromResult(p);
            },
            (_, e, j) =>
            {
                j.Title = e.Title; j.Organisation = e.Organisation; j.Summary = e.Summary;
                j.Highlights.Clear();
                j.Highlights.AddRange(e.Highlights.Select((h, i) => new Highlight { En = h.En, Ar = h.Ar, SortOrder = i }));
                j.StartDate = e.StartDate; j.EndDate = e.EndDate;
                j.Kind = e.Kind == "main" ? JourneyKind.Main : JourneyKind.Additional;
                j.Seniority = e.Seniority; j.Visible = e.Visible; j.UpdatedAt = DateTimeOffset.UtcNow;
                return Task.CompletedTask;
            },
            j => new
            {
                j.Id, j.SortOrder, j.Title, j.Organisation, j.Summary,
                Highlights = j.Highlights.OrderBy(h => h.SortOrder).Select(h => LocalizedText.Of(h.En, h.Ar)),
                j.StartDate, j.EndDate, Kind = j.Kind == JourneyKind.Main ? "main" : "additional", j.Seniority, j.Visible,
            });

        OrderedCrud.Map<Project, ProjectEdit>(admin, "/projects",
            db => db.Projects,
            async (db, e, existing) =>
            {
                var p = new Problems().Text("title", e.Title, 200).Text("summary", e.Summary, 600).Text("body", e.Body, 8000);
                if (e.Slug is null || e.Slug.Length > 80 || !SlugPattern().IsMatch(e.Slug)) p.Add("slug", "lower-case letters, digits and single hyphens");
                else if (await db.Projects.AnyAsync(x => x.Slug == e.Slug && (existing == null || x.Id != existing.Id))) p.Add("slug", "already used by another project");
                if (e.Technologies is null) p.Add("technologies", "required");
                else if (e.Technologies.Count > 30 || e.Technologies.Any(t => string.IsNullOrWhiteSpace(t) || t.Length > 40)) p.Add("technologies", "up to 30 names of at most 40 characters");
                await ProfileAdmin.MediaExists(db, p, "coverMediaId", e.CoverMediaId);
                return p;
            },
            async (db, e, project) =>
            {
                if (project.Id != 0 && project.Slug != e.Slug)
                {
                    // Old links keep working. A redirect FROM the new slug would loop, so it goes.
                    db.ProjectSlugRedirects.RemoveRange(db.ProjectSlugRedirects.Where(r => r.OldSlug == e.Slug));
                    if (!await db.ProjectSlugRedirects.AnyAsync(r => r.OldSlug == project.Slug))
                        db.ProjectSlugRedirects.Add(new ProjectSlugRedirect { OldSlug = project.Slug, ProjectId = project.Id });
                }
                if (e.Featured)
                    await db.Projects.Where(x => x.Featured && x.Id != project.Id).ForEachAsync(x => x.Featured = false);

                project.Slug = e.Slug; project.Title = e.Title; project.Summary = e.Summary; project.Body = e.Body;
                project.Technologies = e.Technologies.Select(t => t.Trim()).ToList();
                project.Featured = e.Featured; project.Visible = e.Visible; project.CoverMediaId = e.CoverMediaId;
                project.UpdatedAt = DateTimeOffset.UtcNow;
            },
            p => new { p.Id, p.SortOrder, p.Slug, p.Title, p.Summary, p.Body, p.Technologies, p.Featured, p.Visible, p.CoverMediaId });

        OrderedCrud.Map<Technology, TechnologyEdit>(admin, "/technologies",
            db => db.Technologies,
            (_, e, _) =>
            {
                var p = new Problems().Text("category", e.Category, 100);
                if (string.IsNullOrWhiteSpace(e.Name) || e.Name.Length > 60) p.Add("name", "1 to 60 characters");
                return Task.FromResult(p);
            },
            (_, e, t) => { t.Name = e.Name.Trim(); t.Category = e.Category; return Task.CompletedTask; },
            t => new { t.Id, t.SortOrder, t.Name, t.Category });

        OrderedCrud.Map<Certificate, CertificateEdit>(admin, "/certificates",
            db => db.Certificates,
            (_, e, _) =>
            {
                var p = new Problems().Text("title", e.Title, 200);
                if (string.IsNullOrWhiteSpace(e.Issuer) || e.Issuer.Length > 100) p.Add("issuer", "1 to 100 characters");
                return Task.FromResult(p);
            },
            (_, e, c) => { c.Title = e.Title; c.Issuer = e.Issuer.Trim(); c.IssuedOn = e.IssuedOn; return Task.CompletedTask; },
            c => new { c.Id, c.SortOrder, c.Title, c.Issuer, c.IssuedOn });

        OrderedCrud.Map<Education, EducationEdit>(admin, "/education",
            db => db.Education,
            (_, e, _) => Task.FromResult(new Problems().Text("degree", e.Degree, 200).Text("institution", e.Institution, 200)),
            (_, e, x) => { x.Degree = e.Degree; x.Institution = e.Institution; return Task.CompletedTask; },
            x => new { x.Id, x.SortOrder, x.Degree, x.Institution });

        OrderedCrud.Map<SpokenLanguage, LanguageEdit>(admin, "/languages",
            db => db.SpokenLanguages,
            (_, e, _) => Task.FromResult(new Problems().Text("name", e.Name, 60).Text("level", e.Level, 60)),
            (_, e, l) => { l.Name = e.Name; l.Level = e.Level; return Task.CompletedTask; },
            l => new { l.Id, l.SortOrder, l.Name, l.Level });
    }
}
```

In `api/Profile.Api/Admin/AdminApi.cs`, before `return admin;` add:
```csharp
        ContentAdmin.Map(admin);
```

In `api/Profile.Api/Content/ContentService.cs`, add after `ProjectAsync`:
```csharp
    /// <summary>The current slug of a project that used to be reachable at <paramref name="oldSlug"/>.</summary>
    public async Task<string?> CurrentSlugAsync(string oldSlug, CancellationToken ct = default)
    {
        var redirect = await db.ProjectSlugRedirects.AsNoTracking().FirstOrDefaultAsync(r => r.OldSlug == oldSlug, ct);
        if (redirect is null) return null;
        return await db.Projects.AsNoTracking().Where(p => p.Id == redirect.ProjectId && p.Visible).Select(p => p.Slug).FirstOrDefaultAsync(ct);
    }
```

In `api/Profile.Api/Seo/PageRoutes.cs`, inside `PageAsync`, replace:
```csharp
            project = await content.ProjectAsync(lang, slug!, ct);
            if (project is null) return await NotFoundAsync(lang, content, renderer, ct);
```
with:
```csharp
            project = await content.ProjectAsync(lang, slug!, ct);
            if (project is null)
            {
                if (await content.CurrentSlugAsync(slug!, ct) is { } current)
                    return Results.Redirect($"/{lang}/projects/{current}{http.Request.QueryString}", permanent: true);
                return await NotFoundAsync(lang, content, renderer, ct);
            }
```

- [ ] **Step 4: Run the tests**

Run the API test command. Expected: all pass (+7).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Admin editing for journey, projects (with slug 301s) and lists"
```

---

### Task 5: Media library, public image URLs and images on the pages

**Files:**
- Create: `api/Profile.Api/Admin/MediaAdmin.cs`, `api/Profile.Api/Content/MediaUrls.cs`, `tests/Profile.Api.Tests/MediaTests.cs`, `tests/Profile.Api.Tests/Fixtures.cs`
- Modify: `api/Profile.Api/Admin/AdminApi.cs`, `api/Profile.Api/Content/PublicDtos.cs`, `api/Profile.Api/Content/ContentService.cs`, `api/Profile.Api/Program.cs`, `api/Profile.Api/Seo/ResponseHeadersMiddleware.cs`, `web/src/types.ts`

**Interfaces:**
- Produces:
  - `POST /api/admin/media` multipart: files `w640`, `w1280`, `w1920` (at least one), fields `fileName`, `width`, `height`, `altEn`, `altAr` → 201 `MediaView`
  - `GET /api/admin/media` → `MediaView[]`; `PUT /api/admin/media/{id:guid}` body `LocalizedText` (alt) → 204; `DELETE /api/admin/media/{id:guid}` → 204, or 409 when referenced
  - `MediaView(Guid Id, string FileName, int Width, int Height, LocalizedText Alt, IReadOnlyList<int> Widths, string PreviewUrl, DateTimeOffset CreatedAt)`
  - public `GET /media/{id:guid}/{file}` where file is `{width}.webp` or `{width}.jpg`
  - `ImageDto(string Src, string SrcSet, int Width, int Height, string Alt)`; `ProfileDto` gains `ImageDto? HeroImage, ImageDto? Portrait`; `ProjectDto` gains `ImageDto? Cover`
  - `MediaUrls.Rendition(Guid id, int width, string contentType) : string`; `MediaSignature.Detect(ReadOnlySpan<byte>) : string?` (`"image/webp"`, `"image/jpeg"`, `"application/pdf"` or null)
  - tests: `Fixtures.Webp(int bytes)`, `Fixtures.Jpeg(int bytes)`, `Fixtures.Png()`, `Fixtures.Svg()`, `Fixtures.Pdf(int bytes)`

- [ ] **Step 1: Write the failing tests**

`tests/Profile.Api.Tests/Fixtures.cs`:
```csharp
using System.Text;

namespace Profile.Api.Tests;

/// <summary>Byte arrays with the right signatures. The server never decodes, so a signature is all it checks.</summary>
public static class Fixtures
{
    public static byte[] Webp(int size = 64)
    {
        var b = new byte[size];
        Encoding.ASCII.GetBytes("RIFF").CopyTo(b, 0);
        Encoding.ASCII.GetBytes("WEBP").CopyTo(b, 8);
        return b;
    }

    public static byte[] Jpeg(int size = 64)
    {
        var b = new byte[size];
        b[0] = 0xFF; b[1] = 0xD8; b[2] = 0xFF;
        return b;
    }

    public static byte[] Png() => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0];
    public static byte[] Svg() => Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"alert(1)\"/>");

    public static byte[] Pdf(int size = 64)
    {
        var b = new byte[size];
        Encoding.ASCII.GetBytes("%PDF-1.7").CopyTo(b, 0);
        return b;
    }
}
```

`tests/Profile.Api.Tests/MediaTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Profile.Api.Tests;

public class MediaTests
{
    internal static MultipartFormDataContent Upload(params (string Field, byte[] Bytes)[] files)
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent("hero.webp"), "fileName" },
            { new StringContent("1920"), "width" },
            { new StringContent("1080"), "height" },
            { new StringContent("Riyadh at dusk"), "altEn" },
            { new StringContent("الرياض عند الغروب"), "altAr" },
        };
        foreach (var (field, bytes) in files)
        {
            var part = new ByteArrayContent(bytes);
            part.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream"); // the server must not trust this
            form.Add(part, field, field + ".bin");
        }
        return form;
    }

    [Fact]
    public async Task An_image_is_uploaded_served_immutably_and_shown_as_the_hero()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        var reply = await admin.PostAsync("/api/admin/media", Upload(("w640", Fixtures.Webp(100)), ("w1280", Fixtures.Webp(200))));
        Assert.Equal(HttpStatusCode.Created, reply.StatusCode);
        var media = (await reply.Content.ReadFromJsonAsync<JsonObject>())!;
        var id = media["id"]!.GetValue<Guid>();

        var file = await app.CreateClient().GetAsync($"/media/{id:N}/1280.webp");
        Assert.Equal(HttpStatusCode.OK, file.StatusCode);
        Assert.Equal("image/webp", file.Content.Headers.ContentType!.MediaType);
        Assert.Contains("immutable", file.Headers.CacheControl!.ToString());
        Assert.Equal(200, (await file.Content.ReadAsByteArrayAsync()).Length);

        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        profile["heroMediaId"] = id.ToString();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync("/api/admin/profile", profile)).StatusCode);

        var home = (await app.CreateClient().GetFromJsonAsync<JsonObject>("/api/public/ar/home"))!;
        var hero = home["profile"]!["heroImage"]!;
        Assert.Equal($"/media/{id:N}/1280.webp", hero["src"]!.GetValue<string>());
        Assert.Contains("640w", hero["srcSet"]!.GetValue<string>());
        Assert.Equal("الرياض عند الغروب", hero["alt"]!.GetValue<string>());
    }

    public static TheoryData<string, byte[]> Rejected => new()
    {
        { "png", Fixtures.Png() },
        { "svg (script inside an image)", Fixtures.Svg() },
        { "pdf renamed", Fixtures.Pdf() },
        { "too large", Fixtures.Webp(3 * 1024 * 1024 + 1) },
    };

    [Theory]
    [MemberData(nameof(Rejected))]
    public async Task Anything_but_a_webp_or_jpeg_within_limits_is_refused(string why, byte[] bytes)
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var reply = await admin.PostAsync("/api/admin/media", Upload(("w1280", bytes)));
        Assert.True(reply.StatusCode == HttpStatusCode.BadRequest, $"{why}: {(int)reply.StatusCode}");
        Assert.Empty((await admin.GetFromJsonAsync<JsonArray>("/api/admin/media"))!);
    }

    [Fact]
    public async Task An_upload_without_any_rendition_is_refused()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync("/api/admin/media", Upload())).StatusCode);
    }

    [Fact]
    public async Task An_image_in_use_cannot_be_deleted_until_it_is_unused()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var id = (await (await admin.PostAsync("/api/admin/media", Upload(("w1280", Fixtures.Jpeg())))).Content
            .ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<Guid>();
        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        profile["portraitMediaId"] = id.ToString();
        await admin.PutAsJsonAsync("/api/admin/profile", profile);

        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/api/admin/media/{id}")).StatusCode);

        profile["portraitMediaId"] = null;
        await admin.PutAsJsonAsync("/api/admin/profile", profile);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/media/{id}")).StatusCode);
    }

    [Fact]
    public async Task A_missing_or_wrongly_named_rendition_is_404()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var id = (await (await admin.PostAsync("/api/admin/media", Upload(("w1280", Fixtures.Webp())))).Content
            .ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<Guid>();
        var client = app.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/media/{id:N}/640.webp")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/media/{id:N}/1280.jpg")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/media/{Guid.NewGuid():N}/1280.webp")).StatusCode);
    }
}
```

- [ ] **Step 2: Run to verify they fail**

Run the API test command. Expected: FAIL — `/api/admin/media` returns 404.

- [ ] **Step 3: Implement**

`api/Profile.Api/Content/MediaUrls.cs`:
```csharp
using System.Security.Cryptography;

namespace Profile.Api.Content;

public static class MediaUrls
{
    public static readonly int[] Widths = [640, 1280, 1920];

    public static string Extension(string contentType) => contentType == "image/jpeg" ? "jpg" : "webp";

    public static string Rendition(Guid id, int width, string contentType) => $"/media/{id:N}/{width}.{Extension(contentType)}";
}

/// <summary>What a file is, from its first bytes - never from its name or the Content-Type a client claims.</summary>
public static class MediaSignature
{
    public static string? Detect(ReadOnlySpan<byte> b)
    {
        if (b.Length >= 12 && b[..4].SequenceEqual("RIFF"u8) && b[8..12].SequenceEqual("WEBP"u8)) return "image/webp";
        if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "image/jpeg";
        if (b.Length >= 5 && b[..5].SequenceEqual("%PDF-"u8)) return "application/pdf";
        return null;
    }

    public static string Sha256(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
}
```

`api/Profile.Api/Admin/MediaAdmin.cs`:
```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Admin;

public sealed record MediaView(
    Guid Id, string FileName, int Width, int Height, LocalizedText Alt, IReadOnlyList<int> Widths, string PreviewUrl, DateTimeOffset CreatedAt);

public static class MediaAdmin
{
    public const int MaxRenditionBytes = 3 * 1024 * 1024;

    public static void Map(RouteGroupBuilder admin, WebApplication app)
    {
        admin.MapGet("/media", async (ProfileContext db) =>
            Results.Ok(await db.Media.AsNoTracking().OrderByDescending(m => m.CreatedAt)
                .Select(m => new { m.Id, m.FileName, m.Width, m.Height, m.Alt, m.CreatedAt,
                    Renditions = m.Renditions.Select(r => new { r.Width, r.ContentType }).ToList() })
                .ToListAsync()
                .ContinueWith(t => t.Result.Select(m => View(m.Id, m.FileName, m.Width, m.Height, m.Alt, m.CreatedAt,
                    m.Renditions.Select(r => (r.Width, r.ContentType)).ToList())))));

        admin.MapPost("/media", async (HttpRequest request, ProfileContext db) =>
        {
            if (!request.HasFormContentType) return new Problems().Add("form", "multipart form required").Result();
            var form = await request.ReadFormAsync();
            var problems = new Problems();
            var media = new Media
            {
                FileName = Short(form["fileName"], 200),
                Width = int.TryParse(form["width"], out var w) && w is > 0 and <= 20000 ? w : 0,
                Height = int.TryParse(form["height"], out var h) && h is > 0 and <= 20000 ? h : 0,
                Alt = LocalizedText.Of(Short(form["altEn"], 300), Short(form["altAr"], 300)),
            };
            if (media.Width == 0) problems.Add("width", "1 to 20000");
            if (media.Height == 0) problems.Add("height", "1 to 20000");

            foreach (var width in MediaUrls.Widths)
            {
                if (form.Files.GetFile($"w{width}") is not { } file) continue;
                if (file.Length > MaxRenditionBytes) { problems.Add($"w{width}", "at most 3 MB"); continue; }

                using var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                var bytes = stream.ToArray();
                var type = MediaSignature.Detect(bytes);
                if (type is not ("image/webp" or "image/jpeg")) { problems.Add($"w{width}", "must be a WebP or JPEG image"); continue; }

                media.Renditions.Add(new MediaRendition { Width = width, ContentType = type, Bytes = bytes, Sha256 = MediaSignature.Sha256(bytes) });
            }
            if (media.Renditions.Count == 0 && !problems.Any) problems.Add("files", "at least one of w640, w1280, w1920");
            if (problems.Any) return problems.Result();

            db.Media.Add(media);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/media/{media.Id}",
                View(media.Id, media.FileName, media.Width, media.Height, media.Alt, media.CreatedAt,
                    media.Renditions.Select(r => (r.Width, r.ContentType)).ToList()));
        }).WithMetadata(new RequestSizeLimitAttribute(12 * 1024 * 1024));

        admin.MapPut("/media/{id:guid}", async (ProfileContext db, Guid id, LocalizedText alt) =>
        {
            var problems = new Problems().Text("alt", alt, 300);
            if (problems.Any) return problems.Result();
            var media = await db.Media.FirstOrDefaultAsync(m => m.Id == id);
            if (media is null) return Results.NotFound();
            media.Alt = alt;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        admin.MapDelete("/media/{id:guid}", async (ProfileContext db, Guid id) =>
        {
            var inUse =
                await db.Profiles.AnyAsync(p => p.HeroMediaId == id || p.PortraitMediaId == id) ||
                await db.Projects.AnyAsync(p => p.CoverMediaId == id) ||
                await db.PageSeo.AnyAsync(p => p.ShareMediaId == id);
            if (inUse) return Results.Problem(statusCode: StatusCodes.Status409Conflict, title: "this image is in use");

            var media = await db.Media.Include(m => m.Renditions).FirstOrDefaultAsync(m => m.Id == id);
            if (media is null) return Results.NotFound();
            db.Media.Remove(media);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Public. A new upload is a new id, so a rendition never changes and can be cached for a year.
        app.MapGet("/media/{id:guid}/{file}", async (ProfileContext db, Guid id, string file, HttpContext http) =>
        {
            var dot = file.IndexOf('.');
            if (dot < 1 || !int.TryParse(file[..dot], out var width)) return Results.NotFound();
            var ext = file[(dot + 1)..];

            var rendition = await db.MediaRenditions.AsNoTracking()
                .Where(r => r.MediaId == id && r.Width == width)
                .Select(r => new { r.ContentType, r.Bytes, r.Sha256 })
                .FirstOrDefaultAsync();
            if (rendition is null || MediaUrls.Extension(rendition.ContentType) != ext) return Results.NotFound();

            http.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            return Results.File(rendition.Bytes, rendition.ContentType, entityTag: new Microsoft.Net.Http.Headers.EntityTagHeaderValue($"\"{rendition.Sha256}\""));
        });
    }

    private static MediaView View(Guid id, string fileName, int width, int height, LocalizedText alt, DateTimeOffset createdAt,
        List<(int Width, string ContentType)> renditions)
    {
        var preview = renditions.OrderBy(r => r.Width).First();
        return new MediaView(id, fileName, width, height, alt, renditions.Select(r => r.Width).OrderBy(x => x).ToList(),
            MediaUrls.Rendition(id, preview.Width, preview.ContentType), createdAt);
    }

    private static string Short(string? value, int max) => (value ?? "").Trim() is var v && v.Length > max ? v[..max] : (value ?? "").Trim();
}
```

In `api/Profile.Api/Admin/AdminApi.cs`, change the signature to accept the app for public routes and register media:
- the method already takes `WebApplication app`; before `return admin;` add:
```csharp
        MediaAdmin.Map(admin, app);
```

In `api/Profile.Api/Content/PublicDtos.cs`:
- add at the end:
```csharp
public sealed record ImageDto(string Src, string SrcSet, int Width, int Height, string Alt);
```
- change `ProfileDto` to end with `..., string Email, string LinkedInUrl, string GitHubUrl, ImageDto? HeroImage, ImageDto? Portrait);`
- change `ProjectDto` to `ProjectDto(string Slug, string Title, string Summary, string Body, IReadOnlyList<string> Technologies, bool Featured, bool AvailableInOtherLanguage, ImageDto? Cover);`

In `api/Profile.Api/Content/ContentService.cs`:
- in `HomeAsync`, after loading `projectRows`, add:
```csharp
        var images = await ImagesAsync(
            new[] { profile.HeroMediaId, profile.PortraitMediaId }.Concat(projectRows.Select(p => p.CoverMediaId)), lang, ct);
```
- change `var projects = projectRows.Where(p => p.IsComplete(lang)).Select(p => Map(p, lang)).ToList();` to:
```csharp
        var projects = projectRows.Where(p => p.IsComplete(lang)).Select(p => Map(p, lang, images)).ToList();
```
- change the `ProfileDto` construction's last line `profile.Email, SafeHttpUrl(profile.LinkedInUrl), SafeHttpUrl(profile.GitHubUrl)),` to:
```csharp
                profile.Email, SafeHttpUrl(profile.LinkedInUrl), SafeHttpUrl(profile.GitHubUrl),
                Image(images, profile.HeroMediaId), Image(images, profile.PortraitMediaId)),
```
- in `ProjectAsync`, replace the return with:
```csharp
        if (row is null || !row.IsComplete(lang)) return null;
        return Map(row, lang, await ImagesAsync([row.CoverMediaId], lang, ct));
```
- replace the `Map` method with:
```csharp
    private static ProjectDto Map(Project p, string lang, IReadOnlyDictionary<Guid, ImageDto> images) => new(
        p.Slug, p.Title.For(lang), p.Summary.For(lang), p.Body.For(lang), p.Technologies, p.Featured,
        p.IsComplete(Lang.Other(lang)), Image(images, p.CoverMediaId));

    private static ImageDto? Image(IReadOnlyDictionary<Guid, ImageDto> images, Guid? id) =>
        id is { } value && images.TryGetValue(value, out var image) ? image : null;

    private async Task<IReadOnlyDictionary<Guid, ImageDto>> ImagesAsync(IEnumerable<Guid?> ids, string lang, CancellationToken ct)
    {
        var wanted = ids.Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
        if (wanted.Count == 0) return new Dictionary<Guid, ImageDto>();

        var rows = await db.Media.AsNoTracking().Where(m => wanted.Contains(m.Id))
            .Select(m => new { m.Id, m.Alt, m.Width, m.Height, Renditions = m.Renditions.Select(r => new { r.Width, r.ContentType }).ToList() })
            .ToListAsync(ct);

        return rows.Where(m => m.Renditions.Count > 0).ToDictionary(m => m.Id, m =>
        {
            var ordered = m.Renditions.OrderBy(r => r.Width).ToList();
            var src = ordered.LastOrDefault(r => r.Width <= 1280) ?? ordered[0];
            return new ImageDto(
                MediaUrls.Rendition(m.Id, src.Width, src.ContentType),
                string.Join(", ", ordered.Select(r => $"{MediaUrls.Rendition(m.Id, r.Width, r.ContentType)} {r.Width}w")),
                m.Width, m.Height, m.Alt.For(lang));
        });
    }
```

In `api/Profile.Api/Seo/ResponseHeadersMiddleware.cs`, change `img-src 'self' data:` to `img-src 'self' data: blob:` (admin previews use blob URLs).

In `web/src/types.ts`, add:
```ts
export interface ImageDto { src: string; srcSet: string; width: number; height: number; alt: string; }
```
and add `heroImage?: ImageDto | null; portrait?: ImageDto | null;` to `ProfileDto`, and `cover?: ImageDto | null;` to `ProjectDto`.

- [ ] **Step 4: Run both suites**

Run the API test command (all pass, +8) and `cd /d/cv/web && npm test && npm run build` (6 pass, build OK).

- [ ] **Step 5: Mutation check**

In `MediaSignature.Detect`, make the WebP branch return `"image/webp"` for any input (`if (b.Length >= 0) return "image/webp";` as the first line). Run `--filter "FullyQualifiedName~MediaTests"`; expect the rejection theory to FAIL. Restore.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Media library: signature-checked uploads, immutable public renditions, images in content"
```

---

### Task 6: CV files

**Files:**
- Create: `api/Profile.Api/Admin/CvAdmin.cs`, `tests/Profile.Api.Tests/CvTests.cs`
- Modify: `api/Profile.Api/Admin/AdminApi.cs`, `api/Profile.Api/Seo/PageRoutes.cs`

**Interfaces:**
- Produces: `GET /api/admin/cv` → `[{ lang, fileName, size, uploadedAt }]`; `PUT /api/admin/cv/{lang}` multipart `file` → 204; `DELETE /api/admin/cv/{lang}` → 204; public `GET /{lang}/cv` → `application/pdf` attachment named `{Name-En}-CV-{lang}.pdf`, falling back to the other language, else the 404 page.

- [ ] **Step 1: Write the failing tests**

`tests/Profile.Api.Tests/CvTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Profile.Api.Tests;

public class CvTests
{
    private static MultipartFormDataContent File(byte[] bytes)
    {
        var part = new ByteArrayContent(bytes);
        part.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        return new MultipartFormDataContent { { part, "file", "cv.pdf" } };
    }

    [Fact]
    public async Task A_cv_is_uploaded_per_language_and_downloaded_as_an_attachment()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsync("/api/admin/cv/ar", File(Fixtures.Pdf(500)))).StatusCode);

        var reply = await app.CreateClient().GetAsync("/ar/cv");

        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        Assert.Equal("application/pdf", reply.Content.Headers.ContentType!.MediaType);
        Assert.Equal("attachment", reply.Content.Headers.ContentDisposition!.DispositionType);
        Assert.Equal("Hesham-Amoudi-CV-ar.pdf", reply.Content.Headers.ContentDisposition.FileNameStar ?? reply.Content.Headers.ContentDisposition.FileName!.Trim('"'));
        Assert.Equal(500, (await reply.Content.ReadAsByteArrayAsync()).Length);
        Assert.Single((await admin.GetFromJsonAsync<JsonArray>("/api/admin/cv"))!);
    }

    [Fact]
    public async Task A_language_without_its_own_cv_gets_the_other_one()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        await admin.PutAsync("/api/admin/cv/en", File(Fixtures.Pdf(300)));

        var reply = await app.CreateClient().GetAsync("/ar/cv");

        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        Assert.Equal(300, (await reply.Content.ReadAsByteArrayAsync()).Length);
    }

    [Fact]
    public async Task No_cv_at_all_is_the_404_page()
    {
        var (app, _) = await AdminTestApp.CreateAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await app.CreateClient().GetAsync("/en/cv")).StatusCode);
    }

    [Theory]
    [InlineData("jpeg renamed to pdf")]
    [InlineData("too large")]
    [InlineData("unsupported language")]
    public async Task Bad_uploads_are_refused(string why)
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var reply = why switch
        {
            "jpeg renamed to pdf" => await admin.PutAsync("/api/admin/cv/en", File(Fixtures.Jpeg())),
            "too large" => await admin.PutAsync("/api/admin/cv/en", File(Fixtures.Pdf(10 * 1024 * 1024 + 1))),
            _ => await admin.PutAsync("/api/admin/cv/fr", File(Fixtures.Pdf())),
        };
        Assert.True(reply.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound, $"{why}: {(int)reply.StatusCode}");
        Assert.Empty((await admin.GetFromJsonAsync<JsonArray>("/api/admin/cv"))!);
    }
}
```

- [ ] **Step 2: Run to verify they fail**

Run the API test command. Expected: FAIL — `/api/admin/cv/ar` 404.

- [ ] **Step 3: Implement**

`api/Profile.Api/Admin/CvAdmin.cs`:
```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Admin;

public static class CvAdmin
{
    public const int MaxBytes = 10 * 1024 * 1024;

    public static void Map(RouteGroupBuilder admin)
    {
        admin.MapGet("/cv", async (ProfileContext db) =>
            Results.Ok(await db.CvFiles.AsNoTracking().OrderBy(c => c.Lang)
                .Select(c => new { c.Lang, c.FileName, Size = c.Bytes.Length, c.UploadedAt }).ToListAsync()));

        admin.MapPut("/cv/{lang}", async (HttpRequest request, ProfileContext db, string lang) =>
        {
            if (!Lang.IsSupported(lang)) return Results.NotFound();
            if (!request.HasFormContentType) return new Problems().Add("file", "multipart form required").Result();
            var form = await request.ReadFormAsync();
            if (form.Files.GetFile("file") is not { } file) return new Problems().Add("file", "required").Result();
            if (file.Length > MaxBytes) return new Problems().Add("file", "at most 10 MB").Result();

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            var bytes = stream.ToArray();
            if (MediaSignature.Detect(bytes) != "application/pdf") return new Problems().Add("file", "must be a PDF").Result();

            var row = await db.CvFiles.FirstOrDefaultAsync(c => c.Lang == lang);
            if (row is null) db.CvFiles.Add(row = new CvFile { Lang = lang });
            row.FileName = Path.GetFileName(file.FileName).Length is > 0 and <= 200 ? Path.GetFileName(file.FileName) : "cv.pdf";
            row.Bytes = bytes;
            row.Sha256 = MediaSignature.Sha256(bytes);
            row.UploadedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).WithMetadata(new RequestSizeLimitAttribute(12 * 1024 * 1024));

        admin.MapDelete("/cv/{lang}", async (ProfileContext db, string lang) =>
        {
            var row = await db.CvFiles.FirstOrDefaultAsync(c => c.Lang == lang);
            if (row is null) return Results.NotFound();
            db.CvFiles.Remove(row);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
```

In `api/Profile.Api/Admin/AdminApi.cs`, before `return admin;` add `CvAdmin.Map(admin);`.

In `api/Profile.Api/Seo/PageRoutes.cs`, after the `/{lang}/projects/{slug}` route add:
```csharp
        app.MapGet("/" + L + "/cv", async (string lang, Profile.Api.Data.ProfileContext db, ContentService c, PageRenderer r, CancellationToken ct) =>
        {
            var files = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(db.CvFiles.AsQueryable(), ct);
            var file = files.FirstOrDefault(f => f.Lang == lang) ?? files.FirstOrDefault();
            if (file is null) return await NotFoundAsync(lang, c, r, ct);

            var home = await c.HomeAsync(Lang.En, ct);
            var name = string.Join('-', (home?.Profile.Name ?? "CV").Split(' ', StringSplitOptions.RemoveEmptyEntries));
            return Results.File(file.Bytes, "application/pdf", $"{name}-CV-{file.Lang}.pdf");
        });
```

- [ ] **Step 4: Run the tests**

Run the API test command. Expected: all pass (+6).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "CV upload per language and download with fallback"
```

---

### Task 7: SEO overrides, site settings and share images in the page head

**Files:**
- Create: `api/Profile.Api/Admin/SeoAdmin.cs`, `api/Profile.Api/Seo/SeoService.cs`, `tests/Profile.Api.Tests/SeoAdminTests.cs`
- Modify: `api/Profile.Api/Admin/AdminApi.cs`, `api/Profile.Api/Seo/PageRenderer.cs`, `api/Profile.Api/Seo/PageRoutes.cs`, `api/Profile.Api/Program.cs`

**Interfaces:**
- Produces:
  - `GET /api/admin/seo` → `{ pages: [{ key, title, description, shareMediaId }], settings: { gaMeasurementId, gaPropertyId, searchConsoleToken, notificationEmail, messageRetentionDays } }` (keys `home`, `journey`, `projects`, created on first read)
  - `PUT /api/admin/seo/pages/{key}` body `PageSeoEdit(LocalizedText Title, LocalizedText Description, Guid? ShareMediaId)` → 204
  - `PUT /api/admin/seo/settings` body `SettingsEdit(string GaMeasurementId, string GaPropertyId, string SearchConsoleToken, string NotificationEmail, int MessageRetentionDays)` → 204
  - `SeoOverrides(string? Title, string? Description, string? ShareImageUrl, string? SearchConsoleToken)` with `SeoOverrides.None`
  - `SeoService.ForPageAsync(PageKind kind, string lang, HomeData home, ProjectDto? project, CancellationToken ct) : Task<SeoOverrides>`
  - `PageRenderer.Render(PageKind kind, string lang, HomeData? home, ProjectDto? project, string path, SeoOverrides seo)`

- [ ] **Step 1: Write the failing tests**

`tests/Profile.Api.Tests/SeoAdminTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Profile.Api.Tests;

public class SeoAdminTests
{
    [Fact]
    public async Task A_page_title_and_description_override_reaches_the_head_in_that_language_only()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        Assert.Equal(3, (await admin.GetFromJsonAsync<JsonObject>("/api/admin/seo"))!["pages"]!.AsArray().Count);

        var body = new JsonObject
        {
            ["title"] = new JsonObject { ["en"] = "", ["ar"] = "هشام العمودي | مطور تطبيقات" },
            ["description"] = new JsonObject { ["en"] = "", ["ar"] = "وصف مخصص" },
            ["shareMediaId"] = null,
        };
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync("/api/admin/seo/pages/home", body)).StatusCode);

        var ar = await app.CreateClient().GetStringAsync("/ar");
        var en = await app.CreateClient().GetStringAsync("/en");
        Assert.Contains("<title>هشام العمودي | مطور تطبيقات</title>", ar);
        Assert.Contains("<meta name=\"description\" content=\"وصف مخصص\">", ar);
        Assert.Contains("<title>Hesham Amoudi — Lead Application Development</title>", en); // untouched default
    }

    [Fact]
    public async Task The_hero_image_is_the_default_share_image_and_a_page_image_overrides_it()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        async Task<Guid> UploadAsync() => (await (await admin.PostAsync("/api/admin/media",
            MediaTests.Upload(("w1280", Fixtures.Webp())))).Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<Guid>();
        var hero = await UploadAsync();
        var share = await UploadAsync();

        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        profile["heroMediaId"] = hero.ToString();
        await admin.PutAsJsonAsync("/api/admin/profile", profile);
        Assert.Contains($"<meta property=\"og:image\" content=\"https://heshamamoudi.com/media/{hero:N}/1280.webp\">",
            await app.CreateClient().GetStringAsync("/en/journey"));

        await admin.PutAsJsonAsync("/api/admin/seo/pages/journey", new JsonObject
        {
            ["title"] = new JsonObject { ["en"] = "", ["ar"] = "" },
            ["description"] = new JsonObject { ["en"] = "", ["ar"] = "" },
            ["shareMediaId"] = share.ToString(),
        });
        var html = await app.CreateClient().GetStringAsync("/en/journey");
        Assert.Contains($"<meta property=\"og:image\" content=\"https://heshamamoudi.com/media/{share:N}/1280.webp\">", html);
        Assert.Contains($"<meta name=\"twitter:image\" content=\"https://heshamamoudi.com/media/{share:N}/1280.webp\">", html);
    }

    [Fact]
    public async Task Settings_are_validated_and_the_search_console_token_is_published()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        var bad = await admin.PutAsJsonAsync("/api/admin/seo/settings", new JsonObject
        {
            ["gaMeasurementId"] = "UA-1234", ["gaPropertyId"] = "abc", ["searchConsoleToken"] = "\"><script>",
            ["notificationEmail"] = "nope", ["messageRetentionDays"] = 1,
        });
        var errors = (await bad.Content.ReadFromJsonAsync<JsonObject>())!["errors"]!.AsObject();
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.Equal(5, errors.Count);

        var good = await admin.PutAsJsonAsync("/api/admin/seo/settings", new JsonObject
        {
            ["gaMeasurementId"] = "G-ABC123XYZ", ["gaPropertyId"] = "123456789", ["searchConsoleToken"] = "abcDEF_123-xyz",
            ["notificationEmail"] = "owner@example.com", ["messageRetentionDays"] = 180,
        });
        Assert.Equal(HttpStatusCode.NoContent, good.StatusCode);
        Assert.Contains("<meta name=\"google-site-verification\" content=\"abcDEF_123-xyz\">", await app.CreateClient().GetStringAsync("/en"));
    }

    [Fact]
    public async Task An_unknown_page_key_is_404()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var body = new JsonObject { ["title"] = new JsonObject { ["en"] = "", ["ar"] = "" }, ["description"] = new JsonObject { ["en"] = "", ["ar"] = "" }, ["shareMediaId"] = null };
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PutAsJsonAsync("/api/admin/seo/pages/admin", body)).StatusCode);
    }
}
```

- [ ] **Step 2: Run to verify they fail**

Run the API test command. Expected: FAIL — `/api/admin/seo` 404.

- [ ] **Step 3: Implement**

`api/Profile.Api/Seo/SeoService.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Seo;

public sealed record SeoOverrides(string? Title, string? Description, string? ShareImageUrl, string? SearchConsoleToken)
{
    public static readonly SeoOverrides None = new(null, null, null, null);
}

public sealed class SeoService(ProfileContext db, SiteOptions site)
{
    public static readonly string[] PageKeys = ["home", "journey", "projects"];

    public async Task<SeoOverrides> ForPageAsync(PageKind kind, string lang, HomeData home, ProjectDto? project, CancellationToken ct)
    {
        var key = kind switch { PageKind.Home => "home", PageKind.Journey => "journey", PageKind.Projects => "projects", _ => null };
        var page = key is null ? null : await db.PageSeo.AsNoTracking().FirstOrDefaultAsync(p => p.Key == key, ct);
        var settings = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(ct);

        string? share = null;
        if (page?.ShareMediaId is { } shareId) share = await ShareUrlAsync(shareId, ct);
        share ??= project?.Cover?.Src ?? home.Profile.HeroImage?.Src;

        return new SeoOverrides(
            page is not null && page.Title.Has(lang) ? page.Title.For(lang) : null,
            page is not null && page.Description.Has(lang) ? page.Description.For(lang) : null,
            share is null ? null : site.Absolute(share),
            string.IsNullOrWhiteSpace(settings?.SearchConsoleToken) ? null : settings.SearchConsoleToken);
    }

    private async Task<string?> ShareUrlAsync(Guid id, CancellationToken ct)
    {
        var renditions = await db.MediaRenditions.AsNoTracking().Where(r => r.MediaId == id)
            .Select(r => new { r.Width, r.ContentType }).ToListAsync(ct);
        var best = renditions.OrderBy(r => r.Width).LastOrDefault(r => r.Width <= 1280) ?? renditions.OrderBy(r => r.Width).FirstOrDefault();
        return best is null ? null : MediaUrls.Rendition(id, best.Width, best.ContentType);
    }
}
```

`api/Profile.Api/Admin/SeoAdmin.cs`:
```csharp
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;
using Profile.Api.Seo;

namespace Profile.Api.Admin;

public sealed record PageSeoEdit(LocalizedText Title, LocalizedText Description, Guid? ShareMediaId);
public sealed record SettingsEdit(string GaMeasurementId, string GaPropertyId, string SearchConsoleToken, string NotificationEmail, int MessageRetentionDays);

public static partial class SeoAdmin
{
    [GeneratedRegex("^G-[A-Z0-9]{4,15}$")] private static partial Regex GaId();
    [GeneratedRegex("^[0-9]{5,15}$")] private static partial Regex PropertyId();
    [GeneratedRegex("^[A-Za-z0-9_-]{10,100}$")] private static partial Regex VerificationToken();

    public static void Map(RouteGroupBuilder admin)
    {
        admin.MapGet("/seo", async (ProfileContext db) =>
        {
            foreach (var key in SeoService.PageKeys)
                if (!await db.PageSeo.AnyAsync(p => p.Key == key)) db.PageSeo.Add(new PageSeo { Key = key });
            if (!await db.SiteSettings.AnyAsync()) db.SiteSettings.Add(new SiteSettings());
            await db.SaveChangesAsync();

            var pages = await db.PageSeo.AsNoTracking().ToListAsync();
            var settings = await db.SiteSettings.AsNoTracking().FirstAsync();
            return Results.Ok(new
            {
                Pages = SeoService.PageKeys.Select(k => pages.Single(p => p.Key == k)).Select(p => new { p.Key, p.Title, p.Description, p.ShareMediaId }),
                Settings = new { settings.GaMeasurementId, settings.GaPropertyId, settings.SearchConsoleToken, settings.NotificationEmail, settings.MessageRetentionDays },
            });
        });

        admin.MapPut("/seo/pages/{key}", async (ProfileContext db, string key, PageSeoEdit edit) =>
        {
            if (!SeoService.PageKeys.Contains(key)) return Results.NotFound();
            var problems = new Problems().Text("title", edit.Title, 70).Text("description", edit.Description, 200);
            await ProfileAdmin.MediaExists(db, problems, "shareMediaId", edit.ShareMediaId);
            if (problems.Any) return problems.Result();

            var page = await db.PageSeo.FirstOrDefaultAsync(p => p.Key == key);
            if (page is null) db.PageSeo.Add(page = new PageSeo { Key = key });
            page.Title = edit.Title; page.Description = edit.Description; page.ShareMediaId = edit.ShareMediaId;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        admin.MapPut("/seo/settings", async (ProfileContext db, SettingsEdit edit) =>
        {
            var problems = new Problems().Email("notificationEmail", edit.NotificationEmail);
            if (edit.GaMeasurementId is null || (edit.GaMeasurementId.Length > 0 && !GaId().IsMatch(edit.GaMeasurementId))) problems.Add("gaMeasurementId", "looks like G-XXXXXXXXXX");
            if (edit.GaPropertyId is null || (edit.GaPropertyId.Length > 0 && !PropertyId().IsMatch(edit.GaPropertyId))) problems.Add("gaPropertyId", "digits only");
            if (edit.SearchConsoleToken is null || (edit.SearchConsoleToken.Length > 0 && !VerificationToken().IsMatch(edit.SearchConsoleToken))) problems.Add("searchConsoleToken", "only the content value of the verification meta tag");
            if (edit.MessageRetentionDays is < 30 or > 3650) problems.Add("messageRetentionDays", "30 to 3650");
            if (problems.Any) return problems.Result();

            var settings = await db.SiteSettings.FirstOrDefaultAsync();
            if (settings is null) db.SiteSettings.Add(settings = new SiteSettings());
            settings.GaMeasurementId = edit.GaMeasurementId!; settings.GaPropertyId = edit.GaPropertyId!;
            settings.SearchConsoleToken = edit.SearchConsoleToken!; settings.NotificationEmail = edit.NotificationEmail;
            settings.MessageRetentionDays = edit.MessageRetentionDays;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
```

In `api/Profile.Api/Admin/AdminApi.cs`, before `return admin;` add `SeoAdmin.Map(admin);`.

In `api/Profile.Api/Program.cs`, after `AddScoped<Profile.Api.Seo.PageRenderer>();` add:
```csharp
builder.Services.AddScoped<Profile.Api.Seo.SeoService>();
```

In `api/Profile.Api/Seo/PageRenderer.cs`:
- change the signature to `public string Render(PageKind kind, string lang, HomeData? home, ProjectDto? project, string path, SeoOverrides seo)`
- after the `var (title, description) = kind switch { ... };` statement add:
```csharp
        title = seo.Title ?? title;
        description = seo.Description ?? description;
```
- after `head.Append("<meta name=\"twitter:card\" content=\"summary_large_image\">");` add:
```csharp
            if (seo.ShareImageUrl is { } image)
            {
                head.Append("<meta property=\"og:image\" content=\"").Append(E(image)).Append("\">");
                head.Append("<meta name=\"twitter:image\" content=\"").Append(E(image)).Append("\">");
            }
            if (seo.SearchConsoleToken is { } verification)
                head.Append("<meta name=\"google-site-verification\" content=\"").Append(E(verification)).Append("\">");
```

In `api/Profile.Api/Seo/PageRoutes.cs`:
- add `SeoService seo` to the four page route lambdas and to `PageAsync`'s parameters (`..., PageRenderer renderer, SeoService seo, CancellationToken ct)`), passing `seo` through from each lambda, e.g.
```csharp
        app.MapGet("/" + L, (string lang, HttpContext http, ContentService c, PageRenderer r, SeoService s, CancellationToken ct) =>
            PageAsync(PageKind.Home, lang, null, http, c, r, s, ct));
```
(same for journey, projects, projects/{slug}).
- in `PageAsync`, replace `var html = renderer.Render(kind, lang, home, project, canonical);` with:
```csharp
        var overrides = await seo.ForPageAsync(kind, lang, home, project, ct);
        var html = renderer.Render(kind, lang, home, project, canonical, overrides);
```
- in `NotFoundAsync`, change the render call to `renderer.Render(PageKind.NotFound, lang, home, null, "/" + lang, SeoOverrides.None)`.

- [ ] **Step 4: Run the tests**

Run the API test command. Expected: all pass (+4).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Page SEO overrides, share images, Search Console token and site settings"
```

---

### Task 8: Completeness report and the admin page shell

**Files:**
- Create: `api/Profile.Api/Admin/CompletenessAdmin.cs`, `tests/Profile.Api.Tests/CompletenessTests.cs`
- Modify: `api/Profile.Api/Admin/AdminApi.cs`, `api/Profile.Api/Seo/PageRenderer.cs`

**Interfaces:**
- Produces:
  - `GET /api/admin/completeness` → `CompletenessItem[]` where `CompletenessItem(string Area, string? Id, string Label, IReadOnlyList<string> Missing)`; areas `profile`, `journey`, `projects`, `technologies`, `certificates`, `education`, `languages`, `media`; `Missing` entries like `"title.ar"`, `"highlights[1].en"`, `"alt.ar"`
  - `GET /admin` and `GET /admin/{**path}` (sign-in required) → the page template with `noindex`, `Cache-Control: no-store`, `<div id="root"></div>` and page-data `{"kind":"admin"}`
  - `PageRenderer.RenderAdminShell(string title) : string`

- [ ] **Step 1: Write the failing tests**

`tests/Profile.Api.Tests/CompletenessTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Profile.Api.Tests;

public class CompletenessTests
{
    [Fact]
    public async Task The_seeded_content_is_complete()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        Assert.Empty((await admin.GetFromJsonAsync<JsonArray>("/api/admin/completeness"))!);
    }

    [Fact]
    public async Task Blanking_one_arabic_highlight_and_one_profile_field_is_reported_precisely()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();

        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        profile["quote"]!["ar"] = "";
        await admin.PutAsJsonAsync("/api/admin/profile", profile);

        var role = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/journey"))![0]!.AsObject();
        role["highlights"]![1]!["ar"] = "";
        await admin.PutAsJsonAsync($"/api/admin/journey/{role["id"]}", role);

        var report = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/completeness"))!;

        Assert.Equal(2, report.Count);
        Assert.Contains(report, i => i!["area"]!.GetValue<string>() == "profile" && i["missing"]!.AsArray().Any(m => m!.GetValue<string>() == "quote.ar"));
        Assert.Contains(report, i => i!["area"]!.GetValue<string>() == "journey" && i["missing"]!.AsArray().Any(m => m!.GetValue<string>() == "highlights[1].ar"));
    }

    [Fact]
    public async Task The_admin_shell_is_served_only_when_signed_in_and_never_cached_or_indexed()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        var signedIn = await admin.GetAsync("/admin/journey");
        var html = await signedIn.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
        Assert.Contains("no-store", signedIn.Headers.CacheControl!.ToString());
        Assert.Contains("<meta name=\"robots\" content=\"noindex\">", html);
        Assert.Contains("\"kind\":\"admin\"", html);

        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateClient().GetAsync("/admin")).StatusCode);
    }
}
```

- [ ] **Step 2: Run to verify they fail**

Run the API test command. Expected: FAIL — completeness 404, `/admin/journey` returns the public 404 page.

- [ ] **Step 3: Implement**

`api/Profile.Api/Admin/CompletenessAdmin.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Admin;

public sealed record CompletenessItem(string Area, string? Id, string Label, IReadOnlyList<string> Missing);

/// <summary>Everything written in one language but not the other. The Arabic site hides such items; this says which.</summary>
public static class CompletenessAdmin
{
    public static void Map(RouteGroupBuilder admin)
    {
        admin.MapGet("/completeness", async (ProfileContext db) =>
        {
            var items = new List<CompletenessItem>();

            void Check(string area, string? id, string label, params (string Field, LocalizedText Text)[] fields)
            {
                var missing = new List<string>();
                foreach (var (field, text) in fields)
                {
                    var hasEn = !string.IsNullOrWhiteSpace(text.En);
                    var hasAr = !string.IsNullOrWhiteSpace(text.Ar);
                    if (hasEn && !hasAr) missing.Add(field + ".ar");
                    if (hasAr && !hasEn) missing.Add(field + ".en");
                }
                if (missing.Count > 0) items.Add(new CompletenessItem(area, id, label, missing));
            }

            if (await db.Profiles.AsNoTracking().OrderBy(p => p.Id).FirstOrDefaultAsync() is { } p)
                Check("profile", null, "Profile", ("name", p.Name), ("headline", p.Headline), ("eyebrow", p.Eyebrow),
                    ("heroTitle", p.HeroTitle), ("heroSubtitle", p.HeroSubtitle), ("summary", p.Summary),
                    ("location", p.Location), ("about", p.About), ("quote", p.Quote));

            foreach (var j in await db.JourneyEntries.AsNoTracking().Include(j => j.Highlights).OrderBy(j => j.SortOrder).ToListAsync())
                Check("journey", j.Id.ToString(), j.Title.En.Length > 0 ? j.Title.En : j.Title.Ar,
                    new[] { ("title", j.Title), ("organisation", j.Organisation), ("summary", j.Summary) }
                        .Concat(j.Highlights.OrderBy(h => h.SortOrder).Select((h, i) => ($"highlights[{i}]", LocalizedText.Of(h.En, h.Ar))))
                        .ToArray());

            foreach (var x in await db.Projects.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync())
                Check("projects", x.Id.ToString(), x.Slug, ("title", x.Title), ("summary", x.Summary), ("body", x.Body));
            foreach (var x in await db.Technologies.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync())
                Check("technologies", x.Id.ToString(), x.Name, ("category", x.Category));
            foreach (var x in await db.Certificates.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync())
                Check("certificates", x.Id.ToString(), x.Issuer, ("title", x.Title));
            foreach (var x in await db.Education.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync())
                Check("education", x.Id.ToString(), x.Degree.En, ("degree", x.Degree), ("institution", x.Institution));
            foreach (var x in await db.SpokenLanguages.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync())
                Check("languages", x.Id.ToString(), x.Name.En, ("name", x.Name), ("level", x.Level));

            // Alt text: an image with none at all is also worth flagging.
            foreach (var m in await db.Media.AsNoTracking().OrderBy(m => m.CreatedAt).Select(m => new { m.Id, m.FileName, m.Alt }).ToListAsync())
            {
                var missing = new List<string>();
                if (string.IsNullOrWhiteSpace(m.Alt.En)) missing.Add("alt.en");
                if (string.IsNullOrWhiteSpace(m.Alt.Ar)) missing.Add("alt.ar");
                if (missing.Count > 0) items.Add(new CompletenessItem("media", m.Id.ToString(), m.FileName, missing));
            }

            return Results.Ok(items);
        });
    }
}
```

In `api/Profile.Api/Admin/AdminApi.cs`, before `return admin;` add:
```csharp
        CompletenessAdmin.Map(admin);

        // The admin app's page. Plan 2b's React admin mounts here.
        IResult Shell(HttpContext http, Profile.Api.Seo.PageRenderer renderer)
        {
            http.Response.Headers.CacheControl = "no-store";
            return Results.Content(renderer.RenderAdminShell("Admin"), "text/html; charset=utf-8");
        }
        app.MapGet("/admin", Shell).RequireAuthorization("admin");
        app.MapGet("/admin/{**path}", Shell).RequireAuthorization("admin");
```

In `api/Profile.Api/Seo/PageRenderer.cs`, add a method:
```csharp
    public string RenderAdminShell(string title) => template.Html
        .Replace("<!--app-lang-->", Lang.En)
        .Replace("<!--app-dir-->", "ltr")
        .Replace("<!--app-head-->", "<title>" + E(title) + "</title><meta name=\"robots\" content=\"noindex\">")
        .Replace("<!--app-body-->", "<script type=\"application/json\" id=\"page-data\">{\"kind\":\"admin\"}</script>");
```

- [ ] **Step 4: Run the tests**

Run the API test command. Expected: all pass (+3).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Completeness report and the signed-in admin page shell"
```

---

### Task 9: Verify, review, deploy the backend

- [ ] **Step 1: Full suites, dependency and image checks**

```bash
cd /d/cv
MSYS_NO_PATHCONV=1 docker run --rm --memory 4g -v "D:/cv:/src" -w /src mcr.microsoft.com/dotnet/sdk:8.0 dotnet test tests/Profile.Api.Tests --nologo -v minimal
MSYS_NO_PATHCONV=1 docker run --rm --memory 4g -v "D:/cv:/src" -w /src mcr.microsoft.com/dotnet/sdk:8.0 sh -c "dotnet list api/Profile.Api package --vulnerable --include-transitive | tail -3"
MSYS_NO_PATHCONV=1 docker run --rm -v "D:/cv:/src" -w /src/web node:22-alpine sh -c "npm ci >/dev/null 2>&1 && npm test && npm run build && npm audit | tail -1"
docker build -q -t cv:local . && MSYS_NO_PATHCONV=1 docker run --rm --memory 2g -v /var/run/docker.sock:/var/run/docker.sock -v selfhost_trivy:/root/.cache/trivy aquasec/trivy:0.74.0@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969 image --quiet --scanners vuln,secret --severity CRITICAL,HIGH,MEDIUM cv:local
```
Expected: all tests pass; no vulnerable packages; `0 vulnerabilities`; Trivy table empty.

- [ ] **Step 2: Fable review**

Dispatch a read-only Fable review of this plan's commits against the spec and this plan, with emphasis on: token validation bypasses, CSRF via the Access cookie, upload handling (signature, size, content type served), stored XSS through any admin field into the public HTML or JSON-LD, slug redirect loops, and tests that pass vacuously. Fix CRITICAL/HIGH findings, re-run Step 1, commit.

- [ ] **Step 3: Set the new environment in the panel, then push**

In the control panel, open the `portfolio` app's environment and add:
- `CloudflareAccess__TeamDomain` = `fikrahaive.cloudflareaccess.com`
- `CloudflareAccess__Audience` = the AUD tag of the "Portfolio admin" Access application
- `CloudflareAccess__AllowedEmails` = the owner's sign-in address

Save **without** redeploying first (the running build does not read them), then:
```bash
git push origin main
```
The auto-deploy picks up the new image; the startup migration adds the new tables.

- [ ] **Step 4: Verify live**

```bash
B=https://heshamamoudi.com
for u in /en /ar /health; do echo "$u $(curl -s -o /dev/null -w %{http_code} $B$u)"; done
echo "admin API without Access -> $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' $B/api/admin/me | cut -c1-80)"
echo "origin without token (inside the network) -> $(MSYS_NO_PATHCONV=1 docker run --rm --network selfhost_edge curlimages/curl:8.10.1 -s -o /dev/null -w %{http_code} http://portfolio:8080/api/admin/me)"
```
Expected: pages and health `200`; the public admin URL redirects to the Access login; the origin refuses a token-less request with `401` — proving the app checks the token itself rather than trusting that Access was in front. Then the owner signs in at `https://heshamamoudi.com/api/admin/me` and sees their own address in `{"email":"..."}`.
