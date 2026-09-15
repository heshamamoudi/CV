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
