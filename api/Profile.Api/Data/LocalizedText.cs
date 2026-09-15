namespace Profile.Api.Data;

/// <summary>The two languages the site speaks, and nothing else.</summary>
public static class Lang
{
    public const string En = "en";
    public const string Ar = "ar";
    public static readonly string[] Supported = [En, Ar];

    public static bool IsSupported(string? lang) => lang is En or Ar;
    public static string Other(string lang) => lang == Ar ? En : Ar;
    public static string Direction(string lang) => lang == Ar ? "rtl" : "ltr";
}

/// <summary>One piece of user-visible text in both languages.</summary>
public sealed class LocalizedText
{
    public string En { get; set; } = "";
    public string Ar { get; set; } = "";

    public string For(string lang) => lang == Lang.Ar ? Ar : En;
    public bool Has(string lang) => !string.IsNullOrWhiteSpace(For(lang));

    public static LocalizedText Of(string en, string ar) => new() { En = en, Ar = ar };
}
