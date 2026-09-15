using System.Net;
using System.Net.Http.Json;
using Profile.Api.Content;

namespace Profile.Api.Tests;

public class PublicApiTests
{
    private static async Task<HttpClient> ClientAsync()
    {
        var app = TestApp.Create(s => InMemoryDb.Use(s, "api-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        return app.CreateClient();
    }

    [Fact]
    public async Task Home_json_is_served_per_language()
    {
        var client = await ClientAsync();
        var home = await client.GetFromJsonAsync<HomeData>("/api/public/en/home");

        Assert.Equal("Hesham Amoudi", home!.Profile.Name);
        Assert.Equal("en", home.Lang);
    }

    [Theory]
    [InlineData("/api/public/fr/home")]
    [InlineData("/api/public/en/projects/no-such-project")]
    public async Task Unknown_language_or_project_is_404(string url)
    {
        var client = await ClientAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(url)).StatusCode);
    }

    [Fact]
    public async Task A_project_is_served_by_slug()
    {
        var client = await ClientAsync();
        var project = await client.GetFromJsonAsync<ProjectDto>("/api/public/ar/projects/safety-management-system");

        Assert.Equal("نظام إدارة السلامة", project!.Title);
        Assert.True(project.AvailableInOtherLanguage);
    }
}
