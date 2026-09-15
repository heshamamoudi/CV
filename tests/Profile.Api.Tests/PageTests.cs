using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Profile.Api.Tests;

public class PageTests
{
    private static async Task<HttpClient> ClientAsync()
    {
        var app = TestApp.Create(s => InMemoryDb.Use(s, "pages-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        return app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    }

    [Fact]
    public async Task English_home_carries_the_real_content_before_any_javascript()
    {
        var html = await (await ClientAsync()).GetStringAsync("/en");

        Assert.Contains("<html lang=\"en\" dir=\"ltr\">", html);
        Assert.Contains("<h1", html);
        Assert.Contains("Hesham Amoudi", html);
        Assert.Contains("Lead Application Development", html);
        Assert.Contains("ALTANFEETHI Company", html);
        Assert.Contains("id=\"page-data\"", html);
    }

    [Fact]
    public async Task Arabic_home_is_right_to_left_and_in_arabic()
    {
        var html = await (await ClientAsync()).GetStringAsync("/ar");

        Assert.Contains("<html lang=\"ar\" dir=\"rtl\">", html);
        Assert.Contains("هشام العمودي", html);
        Assert.Contains("قائد تطوير التطبيقات", html);
    }

    [Fact]
    public async Task Head_has_canonical_hreflang_open_graph_and_structured_data()
    {
        var html = await (await ClientAsync()).GetStringAsync("/en/journey");

        Assert.Contains("<link rel=\"canonical\" href=\"https://heshamamoudi.com/en/journey\">", html);
        Assert.Contains("<link rel=\"alternate\" hreflang=\"ar\" href=\"https://heshamamoudi.com/ar/journey\">", html);
        Assert.Contains("<link rel=\"alternate\" hreflang=\"x-default\" href=\"https://heshamamoudi.com/en/journey\">", html);
        Assert.Contains("<meta property=\"og:locale\" content=\"en_US\">", html);
        Assert.Contains("<meta property=\"og:locale:alternate\" content=\"ar_SA\">", html);
        Assert.Contains("\"@type\":\"ProfilePage\"", html);
        Assert.Contains("\"@type\":\"BreadcrumbList\"", html);
    }

    [Fact]
    public async Task A_project_page_exists_in_both_languages_and_links_its_twin()
    {
        var client = await ClientAsync();
        var html = await client.GetStringAsync("/ar/projects/safety-management-system");

        Assert.Contains("نظام إدارة السلامة", html);
        Assert.Contains("hreflang=\"en\" href=\"https://heshamamoudi.com/en/projects/safety-management-system\"", html);
    }

    [Theory]
    [InlineData("/fr")]
    [InlineData("/en/projects/no-such-project")]
    [InlineData("/en/nowhere")]
    public async Task Unknown_pages_are_a_real_404_page(string path)
    {
        var reply = await (await ClientAsync()).GetAsync(path);
        var html = await reply.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.NotFound, reply.StatusCode);
        Assert.Contains("<meta name=\"robots\" content=\"noindex\">", html);
    }

    [Theory]
    [InlineData("ar-SA,ar;q=0.9,en;q=0.8", "/ar")]
    [InlineData("en-US,en;q=0.9", "/en")]
    [InlineData("", "/en")]
    public async Task The_root_sends_visitors_to_their_language(string acceptLanguage, string expected)
    {
        var client = await ClientAsync();
        var request = new HttpRequestMessage(HttpMethod.Get, "/");
        if (acceptLanguage.Length > 0) request.Headers.TryAddWithoutValidation("Accept-Language", acceptLanguage);

        var reply = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Redirect, reply.StatusCode);
        Assert.Equal(expected, reply.Headers.Location!.OriginalString);
        Assert.Contains("Accept-Language", reply.Headers.Vary);
    }

    [Fact]
    public async Task Www_redirects_permanently_to_the_bare_domain()
    {
        var client = await ClientAsync();
        var request = new HttpRequestMessage(HttpMethod.Get, "/en/projects?x=1");
        request.Headers.Host = "www.heshamamoudi.com";

        var reply = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.MovedPermanently, reply.StatusCode);
        Assert.Equal("https://heshamamoudi.com/en/projects?x=1", reply.Headers.Location!.OriginalString);
    }

    [Fact]
    public async Task Embedded_data_cannot_break_out_of_its_script_tag()
    {
        // Content that would close the script tag if it were not escaped.
        var app = TestApp.Create(s => InMemoryDb.Use(s, "escape-" + Guid.NewGuid()));
        await InMemoryDb.SeededAsync(app.Services);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Profile.Api.Data.ProfileContext>();
            var profile = db.Profiles.First();
            profile.About.En = "</script><img src=x onerror=alert(1)>";
            db.SaveChanges();
        }

        var html = await app.CreateClient().GetStringAsync("/en");
        var marker = "id=\"page-data\">";
        var start = html.IndexOf(marker, StringComparison.Ordinal);
        var end = html.IndexOf("</script>", start, StringComparison.Ordinal);
        var data = html[(start + marker.Length)..end];

        Assert.True(start > 0 && end > start);
        Assert.Contains("onerror", data); // the hostile text really is in the data
        Assert.DoesNotContain("<", data);
    }
}
