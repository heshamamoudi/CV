using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;
using Profile.Api.Admin;

namespace Profile.Api.Content;

public sealed record ContactSubmission(Guid RequestId, string? Name, string? Email, string? Subject,
    string? Message, string? Lang, string? Website);

public static class ContactApi
{
    public static async Task<IResult> Submit(ContactSubmission input, ProfileContext db, CancellationToken ct)
    {
        var name = input.Name?.Trim() ?? "";
        var email = input.Email?.Trim() ?? "";
        var subject = input.Subject?.Trim() ?? "";
        var message = input.Message?.Trim() ?? "";
        var lang = input.Lang?.Trim().ToLowerInvariant() ?? "";
        var problems = new Problems();
        if (input.RequestId == Guid.Empty) problems.Add("requestId", "must be a GUID");
        problems.Line("name", name, 120).Line("email", email, 200).Email("email", email).Line("subject", subject, 160);
        if (message.Length == 0 || message.Length > 4000) problems.Add("message", "1 to 4000 characters");
        else if (Problems.HasControl(message, allowLineBreaks: true)) problems.Add("message", "contains invisible control characters");
        if (lang is not ("en" or "ar")) problems.Add("lang", "must be en or ar");
        if (problems.Any) return problems.Result();

        // A filled honeypot receives the same generic receipt as a real message.
        if (!string.IsNullOrWhiteSpace(input.Website)) return Results.Ok(new { received = true });

        if (await db.ContactMessages.AnyAsync(x => x.RequestId == input.RequestId, ct))
            return Results.Ok(new { received = true });

        var contact = new ContactMessage
        {
            RequestId = input.RequestId,
            Name = name,
            Email = email,
            Subject = subject,
            Body = message,
            Lang = lang,
            Status = "new",
            ReceivedAt = DateTimeOffset.UtcNow,
        };
        db.ContactMessages.Add(contact);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Concurrent retries race on the unique idempotency key. Only that
            // collision counts as success; other storage failures remain errors.
            db.Entry(contact).State = EntityState.Detached;
            if (!await db.ContactMessages.AnyAsync(x => x.RequestId == input.RequestId, ct)) throw;
        }

        return Results.Ok(new { received = true });
    }

}
