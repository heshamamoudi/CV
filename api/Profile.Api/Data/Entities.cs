namespace Profile.Api.Data;

public enum JourneyKind { Main, Additional }

public sealed class ProfileRecord
{
    public int Id { get; set; }
    public LocalizedText Name { get; set; } = new();
    public LocalizedText Headline { get; set; } = new();
    public LocalizedText Eyebrow { get; set; } = new();
    public LocalizedText HeroTitle { get; set; } = new();
    public LocalizedText HeroSubtitle { get; set; } = new();
    public LocalizedText Summary { get; set; } = new();
    public LocalizedText Location { get; set; } = new();
    public LocalizedText About { get; set; } = new();
    public LocalizedText Quote { get; set; } = new();
    public string Email { get; set; } = "";
    public string LinkedInUrl { get; set; } = "";
    public string GitHubUrl { get; set; } = "";
    public Guid? HeroMediaId { get; set; }
    public Guid? PortraitMediaId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class JourneyEntry : IOrdered
{
    public int Id { get; set; }
    public LocalizedText Title { get; set; } = new();
    public LocalizedText Organisation { get; set; } = new();
    public LocalizedText Summary { get; set; } = new();
    public List<Highlight> Highlights { get; set; } = [];
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public JourneyKind Kind { get; set; }
    /// <summary>1–5; drives the height of the building in the 3D journey.</summary>
    public int Seniority { get; set; } = 1;
    public int SortOrder { get; set; }
    public bool Visible { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public bool IsComplete(string lang) =>
        Title.Has(lang) && Organisation.Has(lang) && Highlights.All(h => h.Has(lang));
}

public sealed class Highlight
{
    public string En { get; set; } = "";
    public string Ar { get; set; } = "";
    public int SortOrder { get; set; }

    public string For(string lang) => lang == Lang.Ar ? Ar : En;
    public bool Has(string lang) => !string.IsNullOrWhiteSpace(For(lang));
}

public sealed class Project : IOrdered
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public LocalizedText Title { get; set; } = new();
    public LocalizedText Summary { get; set; } = new();
    public LocalizedText Body { get; set; } = new();
    public List<string> Technologies { get; set; } = [];
    public Guid? CoverMediaId { get; set; }
    public bool Featured { get; set; }
    public int SortOrder { get; set; }
    public bool Visible { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public bool IsComplete(string lang) => Title.Has(lang) && Summary.Has(lang);
}

public sealed class Technology : IOrdered
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public LocalizedText Category { get; set; } = new();
    public int SortOrder { get; set; }
}

public sealed class Certificate : IOrdered
{
    public int Id { get; set; }
    public LocalizedText Title { get; set; } = new();
    public string Issuer { get; set; } = "";
    public DateOnly IssuedOn { get; set; }
    public int SortOrder { get; set; }
}

public sealed class Education : IOrdered
{
    public int Id { get; set; }
    public LocalizedText Degree { get; set; } = new();
    public LocalizedText Institution { get; set; } = new();
    public int SortOrder { get; set; }
}

public sealed class SpokenLanguage : IOrdered
{
    public int Id { get; set; }
    public LocalizedText Name { get; set; } = new();
    public LocalizedText Level { get; set; } = new();
    public int SortOrder { get; set; }
}
