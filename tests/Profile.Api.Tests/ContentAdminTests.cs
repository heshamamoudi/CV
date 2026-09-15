using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Profile.Api.Tests;

public class ContentAdminTests
{
    private static JsonObject L(string en, string ar) => new() { ["en"] = en, ["ar"] = ar };

    [Fact]
    public async Task A_journey_entry_is_created_edited_reordered_and_deleted()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var body = new JsonObject
        {
            ["title"] = L("Senior Digital Compliance Specialist", "أخصائي أول الامتثال الرقمي"),
            ["organisation"] = L("GACA", "الهيئة العامة للطيران المدني"),
            ["summary"] = L("", ""),
            ["highlights"] = new JsonArray(L("Compliance", "الامتثال")),
            ["startDate"] = "2026-01-01", ["endDate"] = null, ["kind"] = "main", ["seniority"] = 5, ["visible"] = true,
        };

        var created = await admin.PostAsJsonAsync("/api/admin/journey", body);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();
        Assert.Contains("الهيئة العامة للطيران المدني", await app.CreateClient().GetStringAsync("/ar"));

        var list = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/journey"))!;
        var ids = list.Select(n => n!["id"]!.GetValue<int>()).ToList();
        ids.Remove(id); ids.Insert(0, id);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync("/api/admin/journey/order", ids)).StatusCode);
        Assert.Equal(id, (await admin.GetFromJsonAsync<JsonArray>("/api/admin/journey"))![0]!["id"]!.GetValue<int>());

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/journey/{id}")).StatusCode);
        Assert.DoesNotContain("GACA", await app.CreateClient().GetStringAsync("/en"));
    }

    [Fact]
    public async Task A_journey_entry_that_ends_before_it_starts_is_refused()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var body = new JsonObject
        {
            ["title"] = L("x", "x"), ["organisation"] = L("x", "x"), ["summary"] = L("", ""), ["highlights"] = new JsonArray(),
            ["startDate"] = "2026-01-01", ["endDate"] = "2025-01-01", ["kind"] = "sideways", ["seniority"] = 9, ["visible"] = true,
        };
        var reply = await admin.PostAsJsonAsync("/api/admin/journey", body);
        var errors = (await reply.Content.ReadFromJsonAsync<JsonObject>())!["errors"]!.AsObject();

        Assert.Equal(HttpStatusCode.BadRequest, reply.StatusCode);
        Assert.True(errors.ContainsKey("endDate"));
        Assert.True(errors.ContainsKey("kind"));
        Assert.True(errors.ContainsKey("seniority"));
    }

    [Fact]
    public async Task Reordering_with_a_partial_list_is_refused()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync("/api/admin/technologies/order", new[] { 1 })).StatusCode);
    }

    [Fact]
    public async Task Renaming_a_project_slug_keeps_old_links_working_with_a_301()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var project = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!
            .Single(p => p!["slug"]!.GetValue<string>() == "safety-management-system")!.AsObject();
        var id = project["id"]!.GetValue<int>();

        project["slug"] = "sms";
        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync($"/api/admin/projects/{id}", project)).StatusCode);

        var client = app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var old = await client.GetAsync("/ar/projects/safety-management-system");

        Assert.Equal(HttpStatusCode.MovedPermanently, old.StatusCode);
        Assert.Equal("/ar/projects/sms", old.Headers.Location!.OriginalString);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/ar/projects/sms")).StatusCode);
    }

    [Fact]
    public async Task Editing_a_journey_entry_replaces_its_text_and_highlights()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var entry = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/journey"))![0]!.AsObject();
        var id = entry["id"]!.GetValue<int>();

        entry["organisation"] = L("Renamed Org", "جهة معدلة");
        entry["highlights"] = new JsonArray(L("Second", "الثاني"), L("First", "الأول"));
        var reply = await admin.PutAsJsonAsync($"/api/admin/journey/{id}", entry);

        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        var saved = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/journey"))!.Single(n => n!["id"]!.GetValue<int>() == id)!;
        Assert.Equal("Renamed Org", saved["organisation"]!["en"]!.GetValue<string>());
        Assert.Equal(new[] { "Second", "First" }, saved["highlights"]!.AsArray().Select(h => h!["en"]!.GetValue<string>()));
        Assert.Contains("جهة معدلة", await app.CreateClient().GetStringAsync("/ar"));
    }

    [Fact]
    public async Task A_new_project_taking_a_freed_slug_gets_its_own_old_link_when_renamed()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var original = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!
            .Single(p => p!["slug"]!.GetValue<string>() == "safety-management-system")!.AsObject();
        original["slug"] = "sms";
        await admin.PutAsJsonAsync($"/api/admin/projects/{original["id"]}", original);

        var newcomer = new JsonObject
        {
            ["slug"] = "safety-management-system", ["title"] = L("Newcomer", "الجديد"), ["summary"] = L("New", "جديد"),
            ["body"] = L("", ""), ["technologies"] = new JsonArray(), ["featured"] = false, ["visible"] = true, ["coverMediaId"] = null,
        };
        var created = (await (await admin.PostAsJsonAsync("/api/admin/projects", newcomer)).Content.ReadFromJsonAsync<JsonObject>())!;
        created["slug"] = "newcomer";
        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync($"/api/admin/projects/{created["id"]}", created)).StatusCode);

        var client = app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var old = await client.GetAsync("/en/projects/safety-management-system");

        Assert.Equal(HttpStatusCode.MovedPermanently, old.StatusCode);
        Assert.Equal("/en/projects/newcomer", old.Headers.Location!.OriginalString);
    }

    [Fact]
    public async Task Project_slugs_must_be_well_formed_and_unique()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var projects = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!;
        var first = projects[0]!.AsObject();
        var secondSlug = projects[1]!["slug"]!.GetValue<string>();

        first["slug"] = secondSlug;
        var duplicate = await admin.PutAsJsonAsync($"/api/admin/projects/{first["id"]}", first);
        first["slug"] = "Not A Slug!";
        var malformed = await admin.PutAsJsonAsync($"/api/admin/projects/{first["id"]}", first);

        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, malformed.StatusCode);
    }

    [Fact]
    public async Task Only_one_project_is_featured()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var projects = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!;
        foreach (var index in new[] { 0, 1 })
        {
            var p = projects[index]!.AsObject();
            p["featured"] = true;
            await admin.PutAsJsonAsync($"/api/admin/projects/{p["id"]}", p);
        }

        var after = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!;
        Assert.Single(after, p => p!["featured"]!.GetValue<bool>());
        Assert.True(after[1]!["featured"]!.GetValue<bool>());
    }

    [Fact]
    public async Task The_simple_lists_are_editable()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/technologies",
            new JsonObject { ["name"] = "Kubernetes", ["category"] = L("Cloud & DevOps", "السحابة وDevOps") })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/certificates",
            new JsonObject { ["title"] = L("CISA", "CISA"), ["issuer"] = "ISACA", ["issuedOn"] = "2026-05-01" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/education",
            new JsonObject { ["degree"] = L("MSc", "ماجستير"), ["institution"] = L("KAU", "جامعة الملك عبدالعزيز") })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/languages",
            new JsonObject { ["name"] = L("French", "الفرنسية"), ["level"] = L("Basic", "مبتدئ") })).StatusCode);

        var html = await app.CreateClient().GetStringAsync("/en");
        Assert.Contains("Kubernetes", html);
        Assert.Contains("CISA — ISACA", html);
        Assert.Contains("French — Basic", html);
    }
}
