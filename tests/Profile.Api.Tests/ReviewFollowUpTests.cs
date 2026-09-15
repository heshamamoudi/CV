using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Profile.Api.Tests;

/// <summary>Findings from the pre-deploy review of the admin backend.</summary>
public class ReviewFollowUpTests
{
    [Fact]
    public async Task Uploads_larger_than_the_in_memory_form_buffer_work()
    {
        // Multipart parts over 64 KB are buffered to a temp file (the container needs a writable /tmp).
        var (app, admin) = await AdminTestApp.CreateAsync();

        var image = await admin.PostAsync("/api/admin/media", MediaTests.Upload(("w1920", Fixtures.Webp(400_000))));
        Assert.Equal(HttpStatusCode.Created, image.StatusCode);
        var id = (await image.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<Guid>();
        Assert.Equal(400_000, (await app.CreateClient().GetByteArrayAsync($"/media/{id:N}/1920.webp")).Length);

        var pdf = new ByteArrayContent(Fixtures.Pdf(900_000));
        pdf.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        var cv = await admin.PutAsync("/api/admin/cv/en", new MultipartFormDataContent { { pdf, "file", "cv.pdf" } });
        Assert.Equal(HttpStatusCode.NoContent, cv.StatusCode);
        Assert.Equal(900_000, (await app.CreateClient().GetByteArrayAsync("/en/cv")).Length);
    }

    [Fact]
    public async Task A_rendition_is_served_under_one_spelling_of_its_id_only()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var id = (await (await admin.PostAsync("/api/admin/media", MediaTests.Upload(("w1280", Fixtures.Webp())))).Content
            .ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<Guid>();
        var client = app.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/media/{id:N}/1280.webp")).StatusCode);
        foreach (var alias in new[] { id.ToString("D"), id.ToString("B"), id.ToString("N").ToUpperInvariant() })
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/media/{alias}/1280.webp")).StatusCode);
    }

    [Fact]
    public async Task An_old_slug_redirects_only_where_the_project_exists_in_that_language()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        var project = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/projects"))!
            .Single(p => p!["slug"]!.GetValue<string>() == "safety-management-system")!.AsObject();
        project["slug"] = "sms";
        project["title"]!["ar"] = "";
        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync($"/api/admin/projects/{project["id"]}", project)).StatusCode);

        var client = app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        Assert.Equal(HttpStatusCode.MovedPermanently, (await client.GetAsync("/en/projects/safety-management-system")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/ar/projects/safety-management-system")).StatusCode);
    }

    [Fact]
    public async Task Control_characters_in_addresses_are_not_found_rather_than_errors()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await app.CreateClient().GetAsync("/en/projects/a%07b")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync("/api/admin/cv/a%07b")).StatusCode);
    }

    [Fact]
    public async Task A_malformed_cv_upload_is_a_field_error()
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var broken = new StringContent("--x\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.pdf\"\r\n\r\n%PDF-");
        broken.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data; boundary=x");

        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsync("/api/admin/cv/en", broken)).StatusCode);
    }
}
