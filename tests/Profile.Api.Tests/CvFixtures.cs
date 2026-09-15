using System.Text;

namespace Profile.Api.Tests;

/// <summary>Upload bodies that carry only the signature bytes the server checks.</summary>
internal static class CvFixtures
{
    public static byte[] Pdf(int size = 64) => WithPrefix(Encoding.ASCII.GetBytes("%PDF-1.7"), size);

    public static byte[] Jpeg(int size = 64) => WithPrefix([0xFF, 0xD8, 0xFF], size);

    private static byte[] WithPrefix(byte[] prefix, int size)
    {
        var bytes = new byte[Math.Max(size, prefix.Length)];
        prefix.CopyTo(bytes, 0);
        return bytes;
    }
}
