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
