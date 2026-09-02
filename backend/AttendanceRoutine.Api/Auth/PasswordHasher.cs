using System.Security.Cryptography;

namespace AttendanceRoutine.Api.Auth;

/// <summary>
/// Password verification compatible with bcrypt and PBKDF2-SHA256 hashes.
/// PBKDF2 stored format: "{iterations}.{saltBase64}.{hashBase64}".
/// </summary>
public static class PasswordHasher
{
    public static bool Verify(string password, string stored)
    {
        try
        {
            if (stored.StartsWith("$2", StringComparison.Ordinal))
                return BCrypt.Net.BCrypt.Verify(password, stored);

            var parts = stored.Split('.', 3);
            if (parts.Length != 3
                || !int.TryParse(parts[0], out var iterations)
                || iterations is < 10_000 or > 1_000_000)
                return false;

            var salt = Convert.FromBase64String(parts[1]);
            var expected = Convert.FromBase64String(parts[2]);
            if (salt.Length == 0 || expected.Length == 0) return false;

            var actual = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iterations,
                HashAlgorithmName.SHA256,
                expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (FormatException)
        {
            return false;
        }
        catch (CryptographicException)
        {
            return false;
        }
    }
}
