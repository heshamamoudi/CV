using System.Text.Json;

namespace Profile.Api.Seo;

/// <summary>The same strings.json the React app imports, embedded at build.</summary>
public static class UiStrings
{
    private static readonly Dictionary<string, Dictionary<string, string>> All = Load();

    public static string Get(string lang, string key) =>
        All.TryGetValue(lang, out var set) && set.TryGetValue(key, out var value) ? value : key;

    private static Dictionary<string, Dictionary<string, string>> Load()
    {
        using var stream = typeof(UiStrings).Assembly.GetManifestResourceStream("strings.json")
            ?? throw new InvalidOperationException("strings.json is not embedded.");
        return JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, string>>>(stream)!;
    }
}
