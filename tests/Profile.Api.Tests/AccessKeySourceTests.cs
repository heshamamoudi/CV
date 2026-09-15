using System.Net;
using System.Security.Cryptography;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Profile.Api.Admin.Access;

namespace Profile.Api.Tests;

public class AccessKeySourceTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 9, 15, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    /// <summary>Stands in for https://{team}/cdn-cgi/access/certs.</summary>
    private sealed class Certs : HttpMessageHandler, IHttpClientFactory
    {
        public int Calls { get; private set; }
        public bool Failing { get; set; }
        public string KeyId { get; set; } = "k1";

        public HttpClient CreateClient(string name) => new(this, disposeHandler: false);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls++;
            Assert.Equal("https://fikrahaive.cloudflareaccess.com/cdn-cgi/access/certs", request.RequestUri!.ToString());
            if (Failing) return Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadGateway));

            var p = RSA.Create(2048).ExportParameters(false);
            var json = $$"""{"keys":[{"kid":"{{KeyId}}","kty":"RSA","alg":"RS256","use":"sig","n":"{{Base64UrlEncoder.Encode(p.Modulus)}}","e":"{{Base64UrlEncoder.Encode(p.Exponent)}}"}]}""";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json) });
        }
    }

    private static (CloudflareAccessKeySource Source, Certs Certs, Clock Clock) Create()
    {
        var certs = new Certs();
        var clock = new Clock();
        var options = Options.Create(new AccessOptions { TeamDomain = "fikrahaive.cloudflareaccess.com" });
        return (new CloudflareAccessKeySource(certs, options, clock, NullLogger<CloudflareAccessKeySource>.Instance), certs, clock);
    }

    private static string KeyId(IReadOnlyCollection<SecurityKey> keys) => Assert.Single(keys).KeyId;

    [Fact]
    public async Task Keys_are_fetched_once_then_cached_for_thirty_minutes()
    {
        var (source, certs, clock) = Create();

        Assert.Equal("k1", KeyId(await source.GetKeysAsync(false, default)));
        clock.Now += TimeSpan.FromMinutes(29);
        await source.GetKeysAsync(false, default);
        Assert.Equal(1, certs.Calls);

        certs.KeyId = "k2";
        clock.Now += TimeSpan.FromMinutes(2);
        Assert.Equal("k2", KeyId(await source.GetKeysAsync(false, default)));
        Assert.Equal(2, certs.Calls);
    }

    [Fact]
    public async Task A_failed_refresh_keeps_the_held_keys_for_a_day_then_gives_up()
    {
        var (source, certs, clock) = Create();
        await source.GetKeysAsync(false, default);
        certs.Failing = true;

        clock.Now += TimeSpan.FromHours(2);
        Assert.Equal("k1", KeyId(await source.GetKeysAsync(false, default)));

        // Within the retry gap nothing is fetched at all.
        var calls = certs.Calls;
        clock.Now += TimeSpan.FromSeconds(5);
        await source.GetKeysAsync(false, default);
        Assert.Equal(calls, certs.Calls);

        clock.Now += TimeSpan.FromHours(23);
        await Assert.ThrowsAsync<HttpRequestException>(() => source.GetKeysAsync(false, default));
    }

    [Fact]
    public async Task An_unknown_key_forces_a_refetch_at_most_every_five_minutes()
    {
        var (source, certs, clock) = Create();
        await source.GetKeysAsync(false, default);
        certs.KeyId = "rotated";

        clock.Now += TimeSpan.FromMinutes(1);
        Assert.Equal("k1", KeyId(await source.GetKeysAsync(true, default)));
        Assert.Equal(1, certs.Calls);

        clock.Now += TimeSpan.FromMinutes(5);
        Assert.Equal("rotated", KeyId(await source.GetKeysAsync(true, default)));
        Assert.Equal(2, certs.Calls);
    }

    [Fact]
    public async Task With_no_keys_ever_a_failure_is_an_error_and_retries_are_throttled()
    {
        var (source, certs, clock) = Create();
        certs.Failing = true;

        await Assert.ThrowsAsync<HttpRequestException>(() => source.GetKeysAsync(false, default));
        clock.Now += TimeSpan.FromSeconds(5);
        await Assert.ThrowsAsync<InvalidOperationException>(() => source.GetKeysAsync(true, default));
        Assert.Equal(1, certs.Calls);

        certs.Failing = false;
        clock.Now += TimeSpan.FromSeconds(30);
        Assert.Equal("k1", KeyId(await source.GetKeysAsync(false, default)));
    }
}
