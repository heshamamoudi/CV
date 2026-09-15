namespace Profile.Api.Admin.Access;

public sealed class AccessOptions
{
    /// <summary>e.g. fikrahaive.cloudflareaccess.com</summary>
    public string TeamDomain { get; set; } = "";

    /// <summary>The Access application's AUD tag - identifies THIS app, so a token for the control panel is refused here.</summary>
    public string Audience { get; set; } = "";

    /// <summary>Comma-separated. Access decides who reaches /admin; this decides who may use it.</summary>
    public string AllowedEmails { get; set; } = "";

    public IReadOnlyList<string> Emails =>
        AllowedEmails.Split([',', ';', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
