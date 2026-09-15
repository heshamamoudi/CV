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
