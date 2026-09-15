using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Profile.Api.Tests;

public class CvTests
{
    private static MultipartFormDataContent File(byte[] bytes)
    {
        var part = new ByteArrayContent(bytes);
        part.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        return new MultipartFormDataContent { { part, "file", "cv.pdf" } };
    }

    [Fact]
    public async Task A_cv_is_uploaded_per_language_and_downloaded_as_an_attachment()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsync("/api/admin/cv/ar", File(CvFixtures.Pdf(500)))).StatusCode);

        var reply = await app.CreateClient().GetAsync("/ar/cv");

        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        Assert.Equal("application/pdf", reply.Content.Headers.ContentType!.MediaType);
        Assert.Equal("attachment", reply.Content.Headers.ContentDisposition!.DispositionType);
        Assert.Equal("Hesham-Amoudi-CV-ar.pdf", reply.Content.Headers.ContentDisposition.FileNameStar ?? reply.Content.Headers.ContentDisposition.FileName!.Trim('"'));
        Assert.Equal("no-cache", reply.Headers.CacheControl?.ToString());
        Assert.Equal(500, (await reply.Content.ReadAsByteArrayAsync()).Length);
        Assert.Equal(HttpStatusCode.OK, (await app.CreateClient().GetAsync("/AR/cv")).StatusCode);

        var list = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/cv"))!;
        var row = Assert.Single(list)!.AsObject();
        Assert.Equal("ar", row["lang"]!.GetValue<string>());
        Assert.Equal("cv.pdf", row["fileName"]!.GetValue<string>());
        Assert.Equal(500, row["size"]!.GetValue<int>());
        Assert.NotNull(row["uploadedAt"]);
    }

    [Fact]
    public async Task A_language_without_its_own_cv_gets_the_other_one()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        await admin.PutAsync("/api/admin/cv/en", File(CvFixtures.Pdf(300)));

        var reply = await app.CreateClient().GetAsync("/ar/cv");

        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        Assert.Equal(300, (await reply.Content.ReadAsByteArrayAsync()).Length);
    }

    [Fact]
    public async Task No_cv_at_all_is_the_404_page()
    {
        var (app, _) = await AdminTestApp.CreateAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await app.CreateClient().GetAsync("/en/cv")).StatusCode);
    }

    [Fact]
    public async Task A_deleted_cv_is_no_longer_downloadable()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        await admin.PutAsync("/api/admin/cv/en", File(CvFixtures.Pdf()));

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync("/api/admin/cv/en")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await app.CreateClient().GetAsync("/en/cv")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync("/api/admin/cv/en")).StatusCode);
    }

    [Theory]
    [InlineData("jpeg renamed to pdf")]
    [InlineData("too large")]
    [InlineData("unsupported language")]
    public async Task Bad_uploads_are_refused(string why)
    {
        var (_, admin) = await AdminTestApp.CreateAsync();
        var reply = why switch
        {
            "jpeg renamed to pdf" => await admin.PutAsync("/api/admin/cv/en", File(CvFixtures.Jpeg())),
            "too large" => await admin.PutAsync("/api/admin/cv/en", File(CvFixtures.Pdf(10 * 1024 * 1024 + 1))),
            _ => await admin.PutAsync("/api/admin/cv/fr", File(CvFixtures.Pdf())),
        };
        Assert.True(reply.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound, $"{why}: {(int)reply.StatusCode}");
        Assert.Empty((await admin.GetFromJsonAsync<JsonArray>("/api/admin/cv"))!);
    }
}
