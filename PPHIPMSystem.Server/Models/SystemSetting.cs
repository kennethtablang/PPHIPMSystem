using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.Models;

// Simple key/value store for runtime-configurable, server-wide settings
// (e.g. the daily backup schedule time).
public class SystemSetting
{
    [Key, MaxLength(100)]
    public string Key { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Value { get; set; } = string.Empty;
}
