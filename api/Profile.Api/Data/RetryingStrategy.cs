using System.Net.Sockets;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using Npgsql.EntityFrameworkCore.PostgreSQL;

namespace Profile.Api.Data;

/// <summary>
/// Npgsql's retrying strategy plus a bare SocketException. A recreated database
/// container's name does not resolve for a few seconds and Npgsql does not count
/// that as transient - which cost inviteQr a guest-facing 500 on 2026-09-13.
/// Six attempts with delays capped at 5 s outlast a recreate.
/// </summary>
public sealed class RetryingStrategy(ExecutionStrategyDependencies dependencies)
    : NpgsqlRetryingExecutionStrategy(dependencies, MaxRetries, MaxDelay, errorCodesToAdd: null)
{
    public const int MaxRetries = 6;
    public static readonly TimeSpan MaxDelay = TimeSpan.FromSeconds(5);

    protected override bool ShouldRetryOn(Exception exception) =>
        base.ShouldRetryOn(exception) || IsTransient(exception);

    public static bool IsTransient(Exception? ex)
    {
        for (var e = ex; e is not null; e = e.InnerException)
        {
            if (e is NpgsqlException { IsTransient: true }) return true;
            if (e is SocketException) return true;
        }
        return false;
    }
}
