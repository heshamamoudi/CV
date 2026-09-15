namespace Profile.Api.Data;

/// <summary>Content with an explicit position the owner controls.</summary>
public interface IOrdered
{
    int Id { get; }
    int SortOrder { get; set; }
}

/// <summary>An uploaded image. The browser resized it; each width is a rendition.</summary>
public sealed class Media
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FileName { get; set; } = "";
    public LocalizedText Alt { get; set; } = new();
    public int Width { get; set; }
    public int Height { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public List<MediaRendition> Renditions { get; set; } = [];
}

public sealed class MediaRendition
{
    public int Id { get; set; }
    public Guid MediaId { get; set; }
    public int Width { get; set; }
    public string ContentType { get; set; } = "";
    public byte[] Bytes { get; set; } = [];
    public string Sha256 { get; set; } = "";
}

/// <summary>The downloadable CV, one per language.</summary>
public sealed class CvFile
{
    public string Lang { get; set; } = "";
    public string FileName { get; set; } = "";
    public byte[] Bytes { get; set; } = [];
    public string Sha256 { get; set; } = "";
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Title/description/share image overrides for home, journey and projects.</summary>
public sealed class PageSeo
{
    public string Key { get; set; } = "";
    public LocalizedText Title { get; set; } = new();
    public LocalizedText Description { get; set; } = new();
    public Guid? ShareMediaId { get; set; }
}

public sealed class SiteSettings
{
    public int Id { get; set; } = 1;
    public string GaMeasurementId { get; set; } = "";
    public string GaPropertyId { get; set; } = "";
    public string SearchConsoleToken { get; set; } = "";
    public string NotificationEmail { get; set; } = "";
    public int MessageRetentionDays { get; set; } = 180;
}

/// <summary>A project's previous slug, so old links 301 to the current one.</summary>
public sealed class ProjectSlugRedirect
{
    public string OldSlug { get; set; } = "";
    public int ProjectId { get; set; }
}
