using System.Net.Sockets;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class DatabaseTests
{
    [Fact]
    public void The_registered_context_uses_the_retrying_strategy()
    {
        using var app = TestApp.Create();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProfileContext>();

        Assert.True(db.Database.IsNpgsql());
        Assert.IsType<RetryingStrategy>(db.Database.CreateExecutionStrategy());
    }

    [Fact]
    public void An_unresolvable_host_and_a_shutdown_are_transient_a_duplicate_is_not()
    {
        Assert.True(RetryingStrategy.IsTransient(new SocketException((int)SocketError.HostNotFound)));
        Assert.True(RetryingStrategy.IsTransient(
            new PostgresException("terminating connection due to administrator command", "FATAL", "FATAL", "57P01")));
        Assert.False(RetryingStrategy.IsTransient(
            new PostgresException("duplicate key", "ERROR", "ERROR", "23505")));
    }

    [Fact]
    public void Localized_text_picks_the_language_and_knows_when_it_is_missing()
    {
        var text = new LocalizedText { En = "Hello", Ar = "" };

        Assert.Equal("Hello", text.For("en"));
        Assert.True(text.Has("en"));
        Assert.False(text.Has("ar"));
    }

    [Fact]
    public void The_model_builds_and_every_localized_field_maps_two_columns()
    {
        var options = new DbContextOptionsBuilder<ProfileContext>()
            .UseNpgsql("Host=x;Database=x").Options;
        using var db = new ProfileContext(options);

        var journey = db.Model.FindEntityType(typeof(JourneyEntry))!;
        var titleOwner = journey.FindNavigation(nameof(JourneyEntry.Title))!.TargetEntityType;

        Assert.NotNull(titleOwner.FindProperty(nameof(LocalizedText.En)));
        Assert.NotNull(titleOwner.FindProperty(nameof(LocalizedText.Ar)));
        Assert.True(journey.FindNavigation(nameof(JourneyEntry.Title))!.ForeignKey.IsRequiredDependent);
    }
}
