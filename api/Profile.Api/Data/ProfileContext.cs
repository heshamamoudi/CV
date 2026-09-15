using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Profile.Api.Data;

public sealed class ProfileContext(DbContextOptions<ProfileContext> options) : DbContext(options)
{
    public DbSet<ProfileRecord> Profiles => Set<ProfileRecord>();
    public DbSet<JourneyEntry> JourneyEntries => Set<JourneyEntry>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Technology> Technologies => Set<Technology>();
    public DbSet<Certificate> Certificates => Set<Certificate>();
    public DbSet<Education> Education => Set<Education>();
    public DbSet<SpokenLanguage> SpokenLanguages => Set<SpokenLanguage>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<ProfileRecord>(e =>
        {
            Text(e, x => x.Name); Text(e, x => x.Headline); Text(e, x => x.Eyebrow);
            Text(e, x => x.HeroTitle); Text(e, x => x.HeroSubtitle); Text(e, x => x.Summary);
            Text(e, x => x.Location); Text(e, x => x.About); Text(e, x => x.Quote);
        });

        b.Entity<JourneyEntry>(e =>
        {
            Text(e, x => x.Title); Text(e, x => x.Organisation); Text(e, x => x.Summary);
            e.OwnsMany(x => x.Highlights, h => h.ToTable("JourneyHighlights"));
            e.Property(x => x.Kind).HasConversion<string>();
        });

        b.Entity<Project>(e =>
        {
            Text(e, x => x.Title); Text(e, x => x.Summary); Text(e, x => x.Body);
            e.HasIndex(x => x.Slug).IsUnique();
            // A plain text column: portable across Postgres and the in-memory test provider.
            e.Property(x => x.Technologies)
                .HasConversion(
                    v => string.Join('\n', v),
                    v => v.Split('\n', StringSplitOptions.RemoveEmptyEntries).ToList(),
                    new ValueComparer<List<string>>(
                        (a, c) => (a ?? new()).SequenceEqual(c ?? new()),
                        v => v.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
                        v => v.ToList()));
        });

        b.Entity<Technology>(e => Text(e, x => x.Category));
        b.Entity<Certificate>(e => Text(e, x => x.Title));
        b.Entity<Education>(e => { Text(e, x => x.Degree); Text(e, x => x.Institution); });
        b.Entity<SpokenLanguage>(e => { Text(e, x => x.Name); Text(e, x => x.Level); });
    }

    /// <summary>A required owned pair of columns: {Nav}_En, {Nav}_Ar.</summary>
    private static void Text<T>(EntityTypeBuilder<T> e, Expression<Func<T, LocalizedText?>> nav) where T : class
    {
        e.OwnsOne(nav);
        e.Navigation(nav).IsRequired();
    }
}
