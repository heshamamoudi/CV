using System.Security.Cryptography;

namespace Profile.Api.Content;

public static class MediaUrls
{
    /// <summary>The widths the admin browser resizes to. Anything else is not a rendition.</summary>
    public static readonly int[] Widths = [640, 1280, 1920];

    public static string Extension(string contentType) => contentType == "image/jpeg" ? "jpg" : "webp";

    /// <summary>The file part of a rendition URL - the one and only name it is served under.</summary>
    public static string FileName(int width, string contentType) => $"{width}.{Extension(contentType)}";

    public static string Rendition(Guid id, int width, string contentType) => $"/media/{id:N}/{FileName(width, contentType)}";
}

/// <summary>What a file is, from its first bytes - never from its name or the Content-Type a client claims.</summary>
public static class MediaSignature
{
    public static string? Detect(ReadOnlySpan<byte> b)
    {
        if (b.Length >= 12 && b[..4].SequenceEqual("RIFF"u8) && b[8..12].SequenceEqual("WEBP"u8)) return "image/webp";
        if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "image/jpeg";
        if (b.Length >= 5 && b[..5].SequenceEqual("%PDF-"u8)) return "application/pdf";
        return null;
    }

    public static string Sha256(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
}
