using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Profile.Api.Tests;

/// <summary>A test host with valid configuration and no startup migration.</summary>
public static class TestApp
{
    public const string BaseUrl = "https://heshamamoudi.com";

    public static WebApplicationFactory<Program> Create(Action<IServiceCollection>? services = null) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseSetting("ConnectionStrings:DefaultConnection", "Host=x;Database=x;Username=x;Password=x");
            b.UseSetting("Site:BaseUrl", BaseUrl);
            b.UseSetting("Startup:Migrate", "false");
            if (services is not null) b.ConfigureServices(services);
        });
}
