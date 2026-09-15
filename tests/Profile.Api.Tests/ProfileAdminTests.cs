using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Profile.Api.Tests;

public class ProfileAdminTests
{
    [Fact]
    public async Task The_profile_is_read_edited_and_shown_on_the_public_page()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        Assert.Equal("هشام العمودي", profile["name"]!["ar"]!.GetValue<string>());

        profile["headline"]!["en"] = "Lead Engineer";
        var reply = await admin.PutAsJsonAsync("/api/admin/profile", profile);

        Assert.Equal(HttpStatusCode.NoContent, reply.StatusCode);
        Assert.Contains("Lead Engineer", await app.CreateClient().GetStringAsync("/en"));
    }

    [Fact]
    public async Task Invalid_values_are_refused_field_by_field_and_nothing_is_saved()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;

        profile["linkedInUrl"] = "javascript:alert(1)";
        profile["email"] = "not-an-email";
        profile["headline"]!["ar"] = new string('x', 201);
        profile["heroMediaId"] = Guid.NewGuid().ToString();
        var reply = await admin.PutAsJsonAsync("/api/admin/profile", profile);
        var errors = (await reply.Content.ReadFromJsonAsync<JsonObject>())!["errors"]!.AsObject();

        Assert.Equal(HttpStatusCode.BadRequest, reply.StatusCode);
        Assert.True(errors.ContainsKey("linkedInUrl"));
        Assert.True(errors.ContainsKey("email"));
        Assert.True(errors.ContainsKey("headline.ar"));
        Assert.True(errors.ContainsKey("heroMediaId"));
        var saved = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        Assert.Equal("heshamamoudi.it@gmail.com", saved["email"]!.GetValue<string>());
    }

    [Fact]
    public async Task Without_sign_in_the_profile_cannot_be_read()
    {
        var (app, _) = await AdminTestApp.CreateAsync();
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateClient().GetAsync("/api/admin/profile")).StatusCode);
    }
}
