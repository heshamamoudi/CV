using Microsoft.EntityFrameworkCore;

/* ------------------------------------------------------------- healthcheck --
 * The runtime image has no curl or wget, so the container's health probe is
 * this binary. The branch must run before any host is built, or every probe
 * starts a second copy of the app (the inviteQr lesson). */
if (args.Contains("--healthcheck"))
{
    var probePort = Environment.GetEnvironmentVariable("PORT") is { Length: > 0 } p ? p : "8080";
    using var probe = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
    try
    {
        var reply = await probe.GetAsync($"http://127.0.0.1:{probePort}/health");
        return reply.IsSuccessStatusCode ? 0 : 1;
    }
    catch
    {
        return 1;
    }
}

var builder = WebApplication.CreateBuilder(args);

string Required(string key, string envName) =>
    builder.Configuration[key] is { Length: > 0 } v
        ? v
        : throw new InvalidOperationException($"{envName} is not set.");

var connectionString = Required("ConnectionStrings:DefaultConnection", "ConnectionStrings__DefaultConnection");
var baseUrl = Required("Site:BaseUrl", "Site__BaseUrl");

builder.Services.AddDbContext<Profile.Api.Data.ProfileContext>(o => o.UseNpgsql(connectionString, n =>
    n.ExecutionStrategy(d => new Profile.Api.Data.RetryingStrategy(d))));
builder.Services.AddScoped<Profile.Api.Content.ContentService>();
builder.Services.AddSingleton(new Profile.Api.Seo.SiteOptions(
    baseUrl.TrimEnd('/'),
    builder.Configuration.GetValue("Site:Indexable", true)));
builder.Services.AddSingleton<Profile.Api.Seo.PageTemplate>();
builder.Services.AddScoped<Profile.Api.Seo.PageRenderer>();
builder.WebHost.ConfigureKestrel(k => k.AddServerHeader = false);

var app = builder.Build();

app.UseMiddleware<Profile.Api.Seo.ResponseHeadersMiddleware>();
app.UseMiddleware<Profile.Api.Seo.CanonicalHostMiddleware>();
app.UseStaticFiles(new StaticFileOptions
{
    // Vite puts a content hash in every /assets file name, so they never change.
    OnPrepareResponse = c =>
    {
        if (c.Context.Request.Path.StartsWithSegments("/assets"))
            c.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
    },
});

app.MapGet("/health", () => Results.Text("ok"));
Profile.Api.Content.PublicApi.MapPublicApi(app);
Profile.Api.Seo.Discovery.MapDiscovery(app);
Profile.Api.Seo.PageRoutes.MapPages(app);

/* Migrate and seed before serving. Retried: on a cold start the app and Postgres
   come up together and losing that race is normal. Switched off in tests. */
if (builder.Configuration.GetValue("Startup:Migrate", true))
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<Profile.Api.Data.ProfileContext>();
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    for (var attempt = 1; ; attempt++)
    {
        try
        {
            await db.Database.MigrateAsync();
            break;
        }
        catch (Exception ex) when (attempt < 12)
        {
            log.LogWarning("database not ready ({Message}); retry {Attempt}/12", ex.Message, attempt);
            await Task.Delay(TimeSpan.FromSeconds(5));
        }
    }
    await Profile.Api.Data.ContentSeed.EnsureAsync(db);
}

app.Run();
return 0;

public partial class Program { }
