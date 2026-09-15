using System.Security.Claims;

namespace Profile.Api.Admin;

public static class AdminApi
{
    public static RouteGroupBuilder MapAdmin(this WebApplication app)
    {
        var admin = app.MapGroup("/api/admin")
            .RequireAuthorization("admin");

        admin.MapGet("/me", (ClaimsPrincipal user) => Results.Ok(new { email = user.FindFirstValue(ClaimTypes.Email) }));
        // A write with no side effect, so the same-origin rule has something to be tested against.
        admin.MapPost("/me/ping", () => Results.Ok(new { ok = true }));

        ProfileAdmin.Map(admin);
        ContentAdmin.Map(admin);
        MediaAdmin.Map(admin, app);
        CvAdmin.Map(admin, app);
        CompletenessAdmin.Map(admin);
        AdminShell.Map(app);

        return admin;
    }
}
