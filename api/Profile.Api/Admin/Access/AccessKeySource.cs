using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Profile.Api.Admin.Access;

/// <summary>Cloudflare's current signing keys. An interface so tests can trust their own key.</summary>
public interface IAccessKeySource
{
    Task<IReadOnlyCollection<SecurityKey>> GetKeysAsync(CancellationToken ct);
}

/// <summary>Cloudflare rotates keys, so they are cached briefly and refetched.</summary>
public sealed class CloudflareAccessKeySource(
    IHttpClientFactory http, IOptions<AccessOptions> options, ILogger<CloudflareAccessKeySource> log) : IAccessKeySource
{
    private static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(30);
    private readonly SemaphoreSlim _lock = new(1, 1);
    private IReadOnlyCollection<SecurityKey>? _keys;
    private DateTimeOffset _fetchedAt = DateTimeOffset.MinValue;

    public async Task<IReadOnlyCollection<SecurityKey>> GetKeysAsync(CancellationToken ct)
    {
        if (_keys is not null && DateTimeOffset.UtcNow - _fetchedAt < CacheFor) return _keys;

        await _lock.WaitAsync(ct);
        try
        {
            if (_keys is not null && DateTimeOffset.UtcNow - _fetchedAt < CacheFor) return _keys;

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
