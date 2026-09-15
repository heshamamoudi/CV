using Microsoft.AspNetCore.Mvc.Testing;

namespace Profile.Api.Tests;

public static class AdminTestApp
{
    /// <summary>A seeded in-memory app and a client that is signed in as the owner.</summary>
    public static async Task<(WebApplicationFactory<Program> App, HttpClient Admin)> CreateAsync()
    {
        var app = TestApp.Create(s => InMemoryDb.Use(s, "admin-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        return (app, AccessTokens.AdminClient(app));
    }
}
