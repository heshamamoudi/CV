using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Admin;

public static class MessagesAdmin
{
    public const int PageSize = 20;
    private static readonly string[] Statuses = ["new", "read", "archived"];

    public static void Map(RouteGroupBuilder admin)
    {
        admin.MapGet("/messages", List);
        admin.MapPatch("/messages/{id:guid}", UpdateStatus);
        admin.MapDelete("/messages/{id:guid}", Delete);
    }

    private static async Task<IResult> List(string? status, string? q, int? page, ProfileContext db, CancellationToken ct)
    {
        var currentPage = page ?? 1;
        if (currentPage < 1 || (status is not null && !Statuses.Contains(status, StringComparer.Ordinal)) || q?.Length > 200)
            return Results.BadRequest(new { error = "Invalid filter or page." });

        var query = db.ContactMessages.AsNoTracking();
        if (status is not null) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            term = term.ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(term) || x.Email.ToLower().Contains(term) ||
                                     x.Subject.ToLower().Contains(term) || x.Body.ToLower().Contains(term));
        }

        var total = await query.CountAsync(ct);
        var unread = await db.ContactMessages.CountAsync(x => x.Status == "new", ct);
        var pageCount = Math.Max(1, (int)Math.Ceiling(total / (double)PageSize));
        currentPage = Math.Min(currentPage, pageCount);
        var items = await query.OrderByDescending(x => x.ReceivedAt).ThenByDescending(x => x.Id)
            .Skip((currentPage - 1) * PageSize).Take(PageSize)
            .Select(x => new MessageItem(x.Id, x.Name, x.Email, x.Subject, x.Body, x.Lang, x.Status, x.ReceivedAt))
            .ToListAsync(ct);
        return Results.Ok(new { items, total, unread, page = currentPage, pageSize = PageSize });
    }

    private static async Task<IResult> UpdateStatus(Guid id, UpdateMessageStatus input, ProfileContext db, CancellationToken ct)
    {
        if (!Statuses.Contains(input.Status ?? "", StringComparer.Ordinal))
            return Results.BadRequest(new { error = "Status must be new, read, or archived." });
        var message = await db.ContactMessages.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (message is null) return Results.NotFound();
        message.Status = input.Status!;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Delete(Guid id, ProfileContext db, CancellationToken ct)
    {
        var message = await db.ContactMessages.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (message is null) return Results.NotFound();
        db.ContactMessages.Remove(message);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private sealed record UpdateMessageStatus(string? Status);
    private sealed record MessageItem(Guid Id, string Name, string Email, string Subject, string Body,
        string Lang, string Status, DateTimeOffset ReceivedAt);
}
