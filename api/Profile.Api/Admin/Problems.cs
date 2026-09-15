using System.Net.Mail;
using Profile.Api.Content;
using Profile.Api.Data;

namespace Profile.Api.Admin;

/// <summary>Field-level validation errors, returned as an RFC 7807 validation problem.</summary>
public sealed class Problems
{
    private readonly Dictionary<string, List<string>> _errors = new();

    public bool Any => _errors.Count > 0;

    public Problems Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var list)) _errors[field] = list = [];
        list.Add(message);
        return this;
    }

    /// <summary>Either language may be empty (drafts are allowed; completeness is reported separately); both are bounded.</summary>
    public Problems Text(string field, LocalizedText? text, int max)
    {
        if (text is null || text.En is null || text.Ar is null) return Add(field, "required");
        foreach (var (suffix, value) in new[] { (".en", text.En), (".ar", text.Ar) })
        {
            if (value.Length > max) Add(field + suffix, $"at most {max} characters");
            else if (HasControl(value, allowLineBreaks: true)) Add(field + suffix, "contains invisible control characters");
        }
        return this;
    }

    /// <summary>A required single-line value such as a name.</summary>
    public Problems Line(string field, string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > max) return Add(field, $"1 to {max} characters");
        if (HasControl(value, allowLineBreaks: false)) Add(field, "contains invisible control characters");
        return this;
    }

    public Problems HttpUrl(string field, string? value)
    {
        if (value is null) return Add(field, "required");
        if (value.Length > 500) return Add(field, "at most 500 characters");
        if (value.Length > 0 && (HasControl(value, false) || ContentService.SafeHttpUrl(value).Length == 0))
            Add(field, "must be an http or https address");
        return this;
    }

    public Problems Email(string field, string? value)
    {
        if (value is null) return Add(field, "required");
        // The address becomes a mailto: link, so nothing that could smuggle headers or a query into it.
        if (value.Length > 0 && (value.Length > 200 || HasControl(value, false) || value.IndexOfAny(['%', '?', '&', ' ']) >= 0 ||
                                 !MailAddress.TryCreate(value, out var parsed) || parsed.Address != value))
            Add(field, "not a valid email address");
        return this;
    }

    public IResult Result() => Results.ValidationProblem(_errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));

    /// <summary>
    /// C0/C1 controls. PostgreSQL refuses NUL in text outright (a 500 instead of a
    /// field error), and the rest are invisible in the page yet change what it says.
    /// </summary>
    public static bool HasControl(string value, bool allowLineBreaks) =>
        value.Any(c => char.IsControl(c) && !(allowLineBreaks && c is '\n' or '\r' or '\t'));
}
