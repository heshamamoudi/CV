using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Profile.Api.Data;

/// <summary>Lets `dotnet ef` build the model without the app's required settings.</summary>
public sealed class DesignTimeFactory : IDesignTimeDbContextFactory<ProfileContext>
{
    public ProfileContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<ProfileContext>().UseNpgsql("Host=design;Database=design").Options);
}
