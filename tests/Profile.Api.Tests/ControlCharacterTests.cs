using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Profile.Api.Tests;

/// <summary>PostgreSQL refuses NUL in text; it must be a field error, never a 500.</summary>
public class ControlCharacterTests
{
    [Theory]
    [InlineData("name.en", "a\u0000b")]
    [InlineData("name.en", "bell\u0007")]
    [InlineData("email", "owner@example.com?cc=x@y.z")]
    [InlineData("linkedInUrl", "https://example.com/\u0000")]
    public async Task Control_characters_in_profile_fields_are_field_errors(string field, string value)
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        if (field == "name.en") profile["name"]!["en"] = value; else profile[field] = value;

        var reply = await admin.PutAsJsonAsync("/api/admin/profile", profile);
        var errors = (await reply.Content.ReadFromJsonAsync<JsonObject>())!["errors"]!.AsObject();

        Assert.Equal(HttpStatusCode.BadRequest, reply.StatusCode);
        Assert.True(errors.ContainsKey(field), string.Join(", ", errors.Select(e => e.Key)));
    }

    [Fact]
    public async Task Line_breaks_and_arabic_direction_marks_are_allowed()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var profile = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/profile"))!;
        profile["about"]!["en"] = "First paragraph.\r\n\r\nSecond paragraph.\tIndented.";
        profile["about"]!["ar"] = "متخصص في \u200e.NET وAngular";

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync("/api/admin/profile", profile)).StatusCode);
    }

    [Fact]
    public async Task Names_and_technology_lists_refuse_control_characters()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var category = new JsonObject { ["en"] = "Cloud", ["ar"] = "السحابة" };

        var tech = await admin.PostAsJsonAsync("/api/admin/technologies", new JsonObject { ["name"] = "Kube\u0000", ["category"] = category });
        var project = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))![0]!.AsObject();
        project["technologies"] = new JsonArray("C#", "Do\u0000cker");
        var projectReply = await admin.PutAsJsonAsync($"/api/admin/projects/{project["id"]}", project);

        Assert.Equal(HttpStatusCode.BadRequest, tech.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, projectReply.StatusCode);
    }
}
