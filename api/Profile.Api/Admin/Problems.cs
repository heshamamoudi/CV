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
        if (text.En.Length > max) Add(field + ".en", $"at most {max} characters");
        if (text.Ar.Length > max) Add(field + ".ar", $"at most {max} characters");
        return this;
    }

    public Problems HttpUrl(string field, string? value)
    {
        if (value is null) return Add(field, "required");
        if (value.Length > 500) return Add(field, "at most 500 characters");
        if (value.Length > 0 && ContentService.SafeHttpUrl(value).Length == 0) Add(field, "must be an http or https address");
        return this;
    }

    public Problems Email(string field, string? value)
    {
        if (value is null) return Add(field, "required");
        if (value.Length > 0 && (value.Length > 200 || !MailAddress.TryCreate(value, out var parsed) || parsed.Address != value))
            Add(field, "not a valid email address");
        return this;
    }

    public IResult Result() => Results.ValidationProblem(_errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));
}
