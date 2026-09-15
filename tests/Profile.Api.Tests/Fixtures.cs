using System.Text;

namespace Profile.Api.Tests;

/// <summary>Byte arrays with the right signatures. The server never decodes, so a signature is all it checks.</summary>
public static class Fixtures
{
    public static byte[] Webp(int size = 64)
    {
        var b = new byte[size];
        Encoding.ASCII.GetBytes("RIFF").CopyTo(b, 0);
        Encoding.ASCII.GetBytes("WEBP").CopyTo(b, 8);
        return b;
    }

    public static byte[] Jpeg(int size = 64)
    {
        var b = new byte[size];
        b[0] = 0xFF; b[1] = 0xD8; b[2] = 0xFF;
        return b;
    }

    public static byte[] Png() => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0];
    public static byte[] Svg() => Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"alert(1)\"/>");

    public static byte[] Pdf(int size = 64)
    {
        var b = new byte[size];
        Encoding.ASCII.GetBytes("%PDF-1.7").CopyTo(b, 0);
        return b;
    }
}
