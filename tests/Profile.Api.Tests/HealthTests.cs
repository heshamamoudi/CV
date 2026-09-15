using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Profile.Api.Tests;

public class HealthTests
{
    [Fact]
    public async Task Health_answers_ok_when_the_database_answers()
    {
        using var app = TestApp.Create(s => InMemoryDb.Use(s, "health-" + Guid.NewGuid()));
        var reply = await app.CreateClient().GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        Assert.Equal("ok", await reply.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Health_is_unhealthy_quickly_and_says_nothing_when_the_database_is_unreachable()
    {
        // TestApp's real Npgsql registration points at a host that does not exist.
        using var app = TestApp.Create();
        var started = DateTime.UtcNow;

        var reply = await app.CreateClient().GetAsync("/health");
        var body = await reply.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.ServiceUnavailable, reply.StatusCode);
        Assert.True(DateTime.UtcNow - started < TimeSpan.FromSeconds(3), "the container probe gives up at 3 s");
        Assert.Equal("database unavailable", body);
    }

    [Theory]
    [InlineData("ConnectionStrings:DefaultConnection", "ConnectionStrings__DefaultConnection")]
    [InlineData("Site:BaseUrl", "Site__BaseUrl")]
    public void A_missing_setting_names_its_variable(string key, string envName)
    {
        using var factory = TestApp.Create().WithWebHostBuilder(b => b.UseSetting(key, ""));

        var ex = Assert.Throws<InvalidOperationException>(() => factory.Services);
        Assert.Contains(envName, ex.Message);
    }
}
