using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Profile.Api.Admin.Access;

namespace Profile.Api.Tests;

/// <summary>Guards that hold for every admin route, including ones added later.</summary>
public class AdminFenceTests
{
    private static List<RouteEndpoint> AdminEndpoints(IServiceProvider services) =>
        services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .Where(e => e.RoutePattern.RawText is { } raw &&
                        (raw.StartsWith("/admin", StringComparison.OrdinalIgnoreCase) ||
                         raw.StartsWith("/api/admin", StringComparison.OrdinalIgnoreCase)))
            .ToList();

    /// <summary>A concrete URL for a route pattern, with a plausible value for each parameter.</summary>
    private static string UrlFor(RouteEndpoint e) =>
        "/" + string.Join('/', e.RoutePattern.PathSegments.Select(s => string.Concat(s.Parts.Select(part => part switch
        {
            Microsoft.AspNetCore.Routing.Patterns.RoutePatternLiteralPart l => l.Content,
            Microsoft.AspNetCore.Routing.Patterns.RoutePatternSeparatorPart sep => sep.Content,
            Microsoft.AspNetCore.Routing.Patterns.RoutePatternParameterPart p => p.ParameterPolicies.Any(x => x.Content == "guid")
                ? Guid.NewGuid().ToString()
                : p.ParameterPolicies.Any(x => x.Content == "int") ? "1" : p.Name == "lang" ? "en" : p.Name == "key" ? "home" : "x",
            _ => "x",
        }))));

    private static IEnumerable<string> Methods(RouteEndpoint e) =>
        e.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? ["GET"];

    [Fact]
    public async Task Every_admin_route_requires_the_admin_policy_and_refuses_the_signed_out()
    {
        using var app = TestApp.Create(s => InMemoryDb.Use(s, "fence-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        var client = app.CreateClient();
        var endpoints = AdminEndpoints(app.Services);

        Assert.True(endpoints.Count >= 20, $"expected the admin routes to be registered, found {endpoints.Count}");
        foreach (var endpoint in endpoints)
        {
            Assert.True(endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>().Any(a => a.Policy == "admin"),
                $"{endpoint.RoutePattern.RawText} is not behind the admin policy");

            foreach (var method in Methods(endpoint))
            {
                var url = UrlFor(endpoint);
                var reply = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url)
                {
                    Content = method is "GET" or "HEAD" ? null : new StringContent("{}", Encoding.UTF8, "application/json"),
                });
                Assert.True(reply.StatusCode == HttpStatusCode.Unauthorized, $"{method} {url} answered {(int)reply.StatusCode} when signed out");
            }
        }
    }

    [Fact]
    public async Task Every_admin_api_write_refuses_a_signed_in_request_that_does_not_prove_same_origin()
    {
        using var app = TestApp.Create(s => InMemoryDb.Use(s, "fence-origin-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        var client = app.CreateClient();

        var writes = AdminEndpoints(app.Services)
            .SelectMany(e => Methods(e).Where(m => m is not ("GET" or "HEAD")).Select(m => (Method: m, Url: UrlFor(e))))
            .ToList();

        Assert.NotEmpty(writes);
        foreach (var (method, url) in writes)
        {
            // The browser attaches the Access cookie to a cross-site form post; nothing else proves the origin.
            var request = new HttpRequestMessage(new HttpMethod(method), url)
            {
                Content = new StringContent("{}", Encoding.UTF8, "application/json"),
            };
            request.Headers.Add("Cookie", "CF_Authorization=" + AccessTokens.Create());
            request.Headers.Add("Sec-Fetch-Site", "same-site");
            var reply = await client.SendAsync(request);
            Assert.True(reply.StatusCode == HttpStatusCode.Forbidden, $"{method} {url} answered {(int)reply.StatusCode}");
        }
    }

    [Fact]
    public async Task A_token_signed_with_hs256_using_the_public_key_as_secret_is_refused()
    {
        using var app = TestApp.Create(s => InMemoryDb.Use(s, "fence-alg-" + Guid.NewGuid()));
        var publicKeyBytes = AccessTokens.Key.Rsa.ExportSubjectPublicKeyInfo();
        var token = new JwtSecurityTokenHandler().CreateEncodedJwt(
            $"https://{AccessTokens.Team}", AccessTokens.Audience,
            new ClaimsIdentity([new Claim("email", AccessTokens.Email)]),
            DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddMinutes(-1),
            new SigningCredentials(new SymmetricSecurityKey(publicKeyBytes) { KeyId = "test-key" }, SecurityAlgorithms.HmacSha256));

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/admin/me");
        request.Headers.Add("Cf-Access-Jwt-Assertion", token);
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateClient().SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task The_allow_list_ignores_case_and_spacing()
    {
        using var app = TestApp.Create(s => InMemoryDb.Use(s, "fence-case-" + Guid.NewGuid()))
            .WithWebHostBuilder(b => b.UseSetting("CloudflareAccess:AllowedEmails", " someone@else.com ; OWNER@Example.com "));
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/admin/me");
        request.Headers.Add("Cf-Access-Jwt-Assertion", AccessTokens.Create());
        Assert.Equal(HttpStatusCode.OK, (await app.CreateClient().SendAsync(request)).StatusCode);
    }

    private sealed class RotatingKeySource(RsaSecurityKey rotated) : IAccessKeySource
    {
        public int Refreshes { get; private set; }

        public Task<IReadOnlyCollection<SecurityKey>> GetKeysAsync(bool refresh, CancellationToken ct)
        {
            if (refresh) Refreshes++;
            return Task.FromResult<IReadOnlyCollection<SecurityKey>>(refresh ? [rotated] : [AccessTokens.Key]);
        }
    }

    [Fact]
    public async Task A_token_from_a_rotated_key_triggers_one_refetch_and_is_accepted()
    {
        var rotated = new RsaSecurityKey(RSA.Create(2048)) { KeyId = "rotated" };
        var source = new RotatingKeySource(rotated);
        using var app = TestApp.Create(s =>
        {
            InMemoryDb.Use(s, "fence-rotate-" + Guid.NewGuid());
            s.AddSingleton<IAccessKeySource>(source);
        });

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/admin/me");
        request.Headers.Add("Cf-Access-Jwt-Assertion", AccessTokens.Create(signWith: rotated));

        Assert.Equal(HttpStatusCode.OK, (await app.CreateClient().SendAsync(request)).StatusCode);
        Assert.Equal(1, source.Refreshes);
    }

    [Fact]
    public async Task A_junk_access_header_on_a_public_page_is_ignored()
    {
        using var app = TestApp.Create(s => InMemoryDb.Use(s, "fence-public-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        var request = new HttpRequestMessage(HttpMethod.Get, "/en");
        request.Headers.Add("Cf-Access-Jwt-Assertion", "junk");
        Assert.Equal(HttpStatusCode.OK, (await app.CreateClient().SendAsync(request)).StatusCode);
    }
}
