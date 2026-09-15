namespace Profile.Api.Content;

public sealed record HomeData(
    string Lang,
    ProfileDto Profile,
    IReadOnlyList<JourneyDto> Journey,
    ProjectDto? FeaturedProject,
    IReadOnlyList<ProjectDto> Projects,
    IReadOnlyList<TechGroupDto> Technologies,
    IReadOnlyList<CertificateDto> Certificates,
    IReadOnlyList<EducationDto> Education,
    IReadOnlyList<LanguageDto> Languages,
    DateTimeOffset UpdatedAt);

public sealed record ProfileDto(
    string Name, string Headline, string Eyebrow, string HeroTitle, string HeroSubtitle, string Summary,
    string Location, string About, string Quote, string Email, string LinkedInUrl, string GitHubUrl,
    ImageDto? HeroImage, ImageDto? Portrait);

public sealed record JourneyDto(
    int Id, string Title, string Organisation, string Summary, IReadOnlyList<string> Highlights,
    string Start, string? End, string Kind, int Seniority);

public sealed record ProjectDto(
    string Slug, string Title, string Summary, string Body, IReadOnlyList<string> Technologies,
    bool Featured, bool AvailableInOtherLanguage, ImageDto? Cover);

public sealed record TechGroupDto(string Category, IReadOnlyList<string> Items);
public sealed record CertificateDto(string Title, string Issuer, string IssuedOn);
public sealed record EducationDto(string Degree, string Institution);
public sealed record LanguageDto(string Name, string Level);

/// <summary>An image as a page shows it. Src and SrcSet are built from the id and widths only - never from uploaded text.</summary>
public sealed record ImageDto(string Src, string SrcSet, int Width, int Height, string Alt);
