using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Admin;

public sealed record ProfileEdit(
    LocalizedText Name, LocalizedText Headline, LocalizedText Eyebrow, LocalizedText HeroTitle, LocalizedText HeroSubtitle,
    LocalizedText Summary, LocalizedText Location, LocalizedText About, LocalizedText Quote,
    string Email, string LinkedInUrl, string GitHubUrl, Guid? HeroMediaId, Guid? PortraitMediaId);

public static class ProfileAdmin
{
    public static void Map(RouteGroupBuilder admin)
    {
        admin.MapGet("/profile", async (ProfileContext db) =>
            await db.Profiles.AsNoTracking().OrderBy(p => p.Id).FirstOrDefaultAsync() is { } p
                ? Results.Ok(new ProfileEdit(p.Name, p.Headline, p.Eyebrow, p.HeroTitle, p.HeroSubtitle, p.Summary, p.Location,
                    p.About, p.Quote, p.Email, p.LinkedInUrl, p.GitHubUrl, p.HeroMediaId, p.PortraitMediaId))
                : Results.NotFound());

        admin.MapPut("/profile", async (ProfileContext db, ProfileEdit edit) =>
        {
            var problems = new Problems()
                .Text("name", edit.Name, 200).Text("headline", edit.Headline, 200).Text("eyebrow", edit.Eyebrow, 200)
                .Text("heroTitle", edit.HeroTitle, 300).Text("heroSubtitle", edit.HeroSubtitle, 600)
                .Text("summary", edit.Summary, 4000).Text("location", edit.Location, 200)
                .Text("about", edit.About, 4000).Text("quote", edit.Quote, 300)
                .Email("email", edit.Email).HttpUrl("linkedInUrl", edit.LinkedInUrl).HttpUrl("gitHubUrl", edit.GitHubUrl);
            await MediaExists(db, problems, "heroMediaId", edit.HeroMediaId);
            await MediaExists(db, problems, "portraitMediaId", edit.PortraitMediaId);
            if (problems.Any) return problems.Result();

            var p = await db.Profiles.OrderBy(x => x.Id).FirstOrDefaultAsync();
            if (p is null) return Results.NotFound();
            p.Name = edit.Name; p.Headline = edit.Headline; p.Eyebrow = edit.Eyebrow;
            p.HeroTitle = edit.HeroTitle; p.HeroSubtitle = edit.HeroSubtitle; p.Summary = edit.Summary;
            p.Location = edit.Location; p.About = edit.About; p.Quote = edit.Quote;
            p.Email = edit.Email; p.LinkedInUrl = edit.LinkedInUrl; p.GitHubUrl = edit.GitHubUrl;
            p.HeroMediaId = edit.HeroMediaId; p.PortraitMediaId = edit.PortraitMediaId;
            p.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    internal static async Task MediaExists(ProfileContext db, Problems problems, string field, Guid? id)
    {
        if (id is { } value && !await db.Media.AnyAsync(m => m.Id == value)) problems.Add(field, "no such image");
    }
}
