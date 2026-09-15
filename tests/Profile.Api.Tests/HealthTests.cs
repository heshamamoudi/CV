using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Profile.Api.Tests;

public class HealthTests
{
    [Fact]
    public async Task Health_answers_ok()
    {
        using var app = TestApp.Create();
        var reply = await app.CreateClient().GetAsync("/health");

        Assert.True(reply.IsSuccessStatusCode);
        Assert.Equal("ok", await reply.Content.ReadAsStringAsync());
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
