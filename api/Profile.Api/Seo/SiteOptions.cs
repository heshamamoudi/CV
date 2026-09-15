namespace Profile.Api.Seo;

public sealed record SiteOptions(string BaseUrl)
{
    public string Absolute(string path) => BaseUrl + path;
    public string Host => new Uri(BaseUrl).Host;
}
