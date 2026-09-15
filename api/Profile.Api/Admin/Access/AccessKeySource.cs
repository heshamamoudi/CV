using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Profile.Api.Admin.Access;

/// <summary>Cloudflare's current signing keys. An interface so tests can trust their own key.</summary>
public interface IAccessKeySource
{
    /// <param name="refresh">
    /// The token names a key not in the set - Cloudflare may have rotated. The
    /// source decides whether a refetch is allowed yet.
    /// </param>
    Task<IReadOnlyCollection<SecurityKey>> GetKeysAsync(bool refresh, CancellationToken ct);
}

/// <summary>
/// Keys are cached for 30 minutes. When a refetch fails, the keys already held
/// keep working for up to a day, so a Cloudflare hiccup does not lock the owner
/// out. A token naming an unknown key may force a refetch, at most every five
/// minutes, so garbage tokens cannot turn every request into a fetch.
/// </summary>
public sealed class CloudflareAccessKeySource(
    IHttpClientFactory http, IOptions<AccessOptions> options, TimeProvider clock, ILogger<CloudflareAccessKeySource> log)
    : IAccessKeySource
{
    public static readonly TimeSpan Fresh = TimeSpan.FromMinutes(30);
    public static readonly TimeSpan StaleLimit = TimeSpan.FromHours(24);
    public static readonly TimeSpan RefreshInterval = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan RetryAfterFailure = TimeSpan.FromSeconds(30);
    public const string HttpClientName = "cf-access";

    private readonly SemaphoreSlim _lock = new(1, 1);
    private IReadOnlyCollection<SecurityKey>? _keys;
    private DateTimeOffset _fetchedAt = DateTimeOffset.MinValue;
    private DateTimeOffset _lastAttempt = DateTimeOffset.MinValue;

    public async Task<IReadOnlyCollection<SecurityKey>> GetKeysAsync(bool refresh, CancellationToken ct)
    {
        if (TryCached(refresh, out var cached)) return cached;

        await _lock.WaitAsync(ct);
        try
        {
            if (TryCached(refresh, out cached)) return cached;

            var now = clock.GetUtcNow();
            var minGap = _keys is not null && refresh ? RefreshInterval : RetryAfterFailure;
            if (_lastAttempt != DateTimeOffset.MinValue && now - _lastAttempt < minGap)
                throw new InvalidOperationException("no usable Cloudflare Access signing keys");

            _lastAttempt = now;
            try
            {
                var client = http.CreateClient(HttpClientName);
                client.Timeout = TimeSpan.FromSeconds(10);
                var json = await client.GetStringAsync($"https://{options.Value.TeamDomain}/cdn-cgi/access/certs", ct);
                var keys = new JsonWebKeySet(json).GetSigningKeys().ToList();
                if (keys.Count == 0) throw new InvalidOperationException("the key set holds no signing keys");

                _keys = keys;
                _fetchedAt = now;
                log.LogInformation("loaded {Count} Cloudflare Access signing keys", keys.Count);
                return keys;
            }
            catch (Exception ex) when (_keys is not null && now - _fetchedAt < StaleLimit)
            {
                log.LogWarning(ex, "could not refresh Cloudflare Access signing keys; still using the set fetched at {FetchedAt}", _fetchedAt);
                return _keys;
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>The held keys, when they may be used without fetching.</summary>
    private bool TryCached(bool refresh, out IReadOnlyCollection<SecurityKey> keys)
    {
        keys = _keys!;
        if (_keys is null) return false;

        var now = clock.GetUtcNow();
        var wantFetch = refresh
            ? now - _lastAttempt >= RefreshInterval
            : now - _fetchedAt >= Fresh && now - _lastAttempt >= RetryAfterFailure;
        return !wantFetch && now - _fetchedAt < StaleLimit;
    }
}
