using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Mvc.Testing;
using Profile.Api.Data;

namespace Profile.Api.Tests;

public class ContactTests
{
    private const string Origin = TestApp.BaseUrl;
    private static object Payload(Guid? requestId = null, string? name = "Alex Visitor", string? email = "alex@example.com",
        string? subject = "Hello", string? message = "A note for Hesham.", string? lang = "en", string? website = "") => new
    {
        requestId = requestId ?? Guid.NewGuid(), name, email, subject, message, lang, website,
    };

    private static HttpRequestMessage ContactRequest(object payload)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/public/contact") { Content = JsonContent.Create(payload) };
        request.Headers.Add("Origin", Origin);
        return request;
    }

    private static WebApplicationFactory<Program> Create(string name) =>
        TestApp.Create(s => InMemoryDb.Use(s, "contact-" + name + Guid.NewGuid()));

    [Fact]
    public async Task Public_submission_is_stored_and_same_request_id_is_idempotent()
    {
        using var app = Create("persist-");
        var client = app.CreateClient();
        var requestId = Guid.NewGuid();
        var first = await client.SendAsync(ContactRequest(Payload(requestId)));
        var repeated = await client.SendAsync(ContactRequest(Payload(requestId, name: "Changed")));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal("{\"received\":true}", await first.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, repeated.StatusCode);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProfileContext>();
        var saved = await db.ContactMessages.SingleAsync();
        Assert.Equal("Alex Visitor", saved.Name);
        Assert.Equal("A note for Hesham.", saved.Body);
        Assert.Equal("new", saved.Status);
    }

    [Fact]
    public async Task Anonymous_cannot_read_the_inbox_and_submission_requires_same_origin()
    {
        using var app = Create("fence-");
        var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/messages")).StatusCode);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/public/contact") { Content = JsonContent.Create(new { invalid = true }) };
        request.Headers.Add("Sec-Fetch-Site", "cross-site");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task Invalid_fields_and_invisible_controls_are_rejected_with_field_errors()
    {
        using var app = Create("validation-");
        var client = app.CreateClient();
        var tooLong = await client.SendAsync(ContactRequest(Payload(name: new string('n', 121))));
        var badEmail = await client.SendAsync(ContactRequest(Payload(email: "bad?@example.com")));
        var invisible = await client.SendAsync(ContactRequest(Payload(subject: "bad\0subject")));
        using var tooLongJson = JsonDocument.Parse(await tooLong.Content.ReadAsStringAsync());
        using var emailJson = JsonDocument.Parse(await badEmail.Content.ReadAsStringAsync());
        using var invisibleJson = JsonDocument.Parse(await invisible.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
        Assert.True(tooLongJson.RootElement.GetProperty("errors").TryGetProperty("name", out _));
        Assert.True(emailJson.RootElement.GetProperty("errors").TryGetProperty("email", out _));
        Assert.True(invisibleJson.RootElement.GetProperty("errors").TryGetProperty("subject", out _));
        Assert.Equal(0, await CountMessagesAsync(app));
    }

    [Fact]
    public async Task Honeypot_gets_a_generic_receipt_without_persisting()
    {
        using var app = Create("honey-");
        var response = await app.CreateClient().SendAsync(ContactRequest(Payload(website: "filled by bot")));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("{\"received\":true}", await response.Content.ReadAsStringAsync());
        Assert.Equal(0, await CountMessagesAsync(app));
    }

    [Fact]
    public async Task Admin_can_filter_search_update_status_and_delete_a_message()
    {
        var (app, admin) = await AdminTestApp.CreateAsync();
        await app.CreateClient().SendAsync(ContactRequest(Payload(name: "Rana Visitor", subject: "Portfolio question")));
        await app.CreateClient().SendAsync(ContactRequest(Payload(name: "Other Visitor", subject: "Something else")));

        var list = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/messages?status=new&q=RANA"))!;
        Assert.Equal(1, list["total"]!.GetValue<int>());
        Assert.Equal(2, list["unread"]!.GetValue<int>());
        var item = list["items"]!.AsArray().Single()!.AsObject();
        Assert.Equal("Rana Visitor", item["name"]!.GetValue<string>());
        Assert.Equal("Portfolio question", item["subject"]!.GetValue<string>());
        Assert.Equal("no-store", (await admin.GetAsync("/api/admin/messages")).Headers.CacheControl!.ToString().Contains("no-store") ? "no-store" : "");

        var id = item["id"]!.GetValue<Guid>();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PatchAsJsonAsync($"/api/admin/messages/{id}", new { status = "read" })).StatusCode);
        var read = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/messages?status=read"))!;
        Assert.Equal(1, read["total"]!.GetValue<int>());
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/messages/{id}")).StatusCode);
    }

    [Fact]
    public async Task Contact_endpoint_returns_429_after_ten_requests_with_retry_after()
    {
        using var app = Create("rate-");
        var client = app.CreateClient();
        for (var i = 0; i < 10; i++)
            Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(ContactRequest(Payload()))).StatusCode);
        var limited = await client.SendAsync(ContactRequest(Payload()));
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal("60", limited.Headers.RetryAfter!.Delta?.TotalSeconds.ToString() ?? limited.Headers.RetryAfter.ToString());
    }

    [Fact]
    public async Task Retention_purges_expired_rows_in_batches_and_keeps_recent_messages()
    {
        using var app = Create("retention-");
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProfileContext>();
        db.SiteSettings.Add(new SiteSettings { Id = 1, MessageRetentionDays = 30 });
        db.ContactMessages.AddRange(
            new ContactMessage { RequestId = Guid.NewGuid(), Name = "Old", Email = "old@example.com", Subject = "old", Body = "old", ReceivedAt = DateTimeOffset.UtcNow.AddDays(-31) },
            new ContactMessage { RequestId = Guid.NewGuid(), Name = "Recent", Email = "new@example.com", Subject = "new", Body = "new", ReceivedAt = DateTimeOffset.UtcNow.AddDays(-2) });
        await db.SaveChangesAsync();

        var removed = await Profile.Api.Content.ContactMessageRetentionService.PurgeExpiredAsync(db, DateTimeOffset.UtcNow);
        Assert.Equal(1, removed);
        Assert.Equal("Recent", (await db.ContactMessages.SingleAsync()).Name);
    }

    private static async Task<int> CountMessagesAsync(WebApplicationFactory<Program> app)
    {
        using var scope = app.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ProfileContext>().ContactMessages.CountAsync();
    }
}
