using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.Models;

// Rotating refresh token: each use revokes the old token and issues a new one,
// so a leaked token dies the first time either party uses it.
public class RefreshToken
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    [MaxLength(100)]
    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? RevokedAt { get; set; }

    [MaxLength(100)]
    public string? ReplacedByToken { get; set; }

    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}
