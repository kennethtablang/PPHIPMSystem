using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Backup;

public class BackupScheduleDto
{
    // 24-hour time of day for the daily backup, "HH:mm" (e.g. "00:00").
    [Required, RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Time must be in HH:mm 24-hour format.")]
    public string Time { get; set; } = "00:00";
}
