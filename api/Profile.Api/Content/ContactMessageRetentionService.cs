using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Content;

/// <summary>Purges expired inbox messages once per day in small database batches.</summary>
public sealed class ContactMessageRetentionService(IServiceScopeFactory scopes, TimeProvider clock, ILogger<ContactMessageRetentionService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24), clock);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<ProfileContext>();
                await PurgeExpiredAsync(db, clock.GetUtcNow(), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Contact message retention purge failed."); }
        }
    }

    internal static async Task<int> PurgeExpiredAsync(ProfileContext db, DateTimeOffset now, CancellationToken ct = default)
    {
        var days = await db.SiteSettings.AsNoTracking().Where(x => x.Id == 1)
            .Select(x => (int?)x.MessageRetentionDays).SingleOrDefaultAsync(ct) ?? 180;
        days = Math.Clamp(days, 30, 3650);
        var cutoff = now.AddDays(-days);
        var purged = 0;
        while (true)
        {
            var batch = await db.ContactMessages.Where(x => x.ReceivedAt < cutoff)
                .OrderBy(x => x.ReceivedAt).Take(500).ToListAsync(ct);
            if (batch.Count == 0) return purged;
            db.ContactMessages.RemoveRange(batch);
            await db.SaveChangesAsync(ct);
            purged += batch.Count;
            db.ChangeTracker.Clear();
        }
    }
}
