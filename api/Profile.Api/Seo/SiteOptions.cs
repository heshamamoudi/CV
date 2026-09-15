namespace Profile.Api.Seo;

/// <param name="BaseUrl">Public origin, no trailing slash.</param>
/// <param name="Indexable">
/// False on the test subdomain: robots.txt disallows everything and every
/// response says noindex, so the test deploy never competes in search with the
/// real site it duplicates.
/// </param>
public sealed record SiteOptions(string BaseUrl, bool Indexable = true)
{
    public string Absolute(string path) => BaseUrl + path;
    public string Host => new Uri(BaseUrl).Host;
}
