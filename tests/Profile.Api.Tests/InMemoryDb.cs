using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public static class InMemoryDb
{
    /// <summary>Swap the Npgsql context for an in-memory one.</summary>
    public static void Use(IServiceCollection services, string name)
    {
        foreach (var d in services.Where(d => d.ServiceType == typeof(DbContextOptions<ProfileContext>)).ToList())
            services.Remove(d);
        services.AddDbContext<ProfileContext>(o => o.UseInMemoryDatabase(name));
    }

    public static async Task SeededAsync(IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        await ContentSeed.EnsureAsync(scope.ServiceProvider.GetRequiredService<ProfileContext>());
    }
}
