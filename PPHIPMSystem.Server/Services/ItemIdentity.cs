using System.Text.RegularExpressions;

namespace PPHIPMSystem.Server.Services;

// Decides whether two inventory items are "the same item". The hospital
// catalog identifies an item by Category + Description/Generic Name + Brand +
// Unit, but the same item is often typed several ways ("3CC SYRINGE" vs
// "3CC, SYRINGE", unit "box" vs "BOXES"). Two levels of matching:
//   • Exact   — same category, name, brand and unit once case, punctuation,
//               spacing and unit spelling are ignored. Blocked on save/import.
//   • Similar — same words in the name (any order, ignoring a stray trailing
//               row counter like "Adrenalin 1mg/ml 2"), same unit, and
//               compatible brands (equal, or one left blank); category is
//               ignored since mis-categorized copies are common. Flagged for
//               review, never blocked.
public static partial class ItemIdentity
{
    // "Adrenalin 1mg/ml 2" — a lone digit at the very end of a name that
    // already carries a strength is a spreadsheet row counter. Without another
    // number ("GLOVES 7") or after "size" ("Size 6") the digit is a real size.
    [GeneratedRegex(@"^(?<rest>.*\d.*?)(?<!\bsize)\s+\d$", RegexOptions.IgnoreCase)]
    private static partial Regex TrailingCounter();

    [GeneratedRegex(@"[^a-z0-9]+")]
    private static partial Regex NonAlphanumeric();

    // Lowercase, punctuation → space, whitespace collapsed.
    public static string Canonical(string? text) =>
        NonAlphanumeric().Replace((text ?? "").Trim().ToLowerInvariant(), " ").Trim();

    public static string Unit(string? unit) =>
        InventoryImportService.NormalizeUnit(unit ?? "").ToLowerInvariant();

    public static string ExactKey(string name, string? brand, string? unit, int categoryId) =>
        $"{categoryId}|{Canonical(name)}|{Canonical(brand)}|{Unit(unit)}";

    // Name reduced to its distinct words in sorted order, so word order,
    // repeated words and punctuation don't hide a duplicate.
    public static string SimilarName(string name)
    {
        var trimmed = TrailingCounter().Replace(name.Trim(), "${rest}");
        var words = Canonical(trimmed).Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Distinct().Order(StringComparer.Ordinal);
        return string.Join(' ', words);
    }

    public static string SimilarBucket(string name, string? unit) => $"{SimilarName(name)}|{Unit(unit)}";

    public static bool BrandsCompatible(string? a, string? b)
    {
        var ca = Canonical(a);
        var cb = Canonical(b);
        return ca.Length == 0 || cb.Length == 0 || ca == cb;
    }

    public static bool IsSimilar(string nameA, string? brandA, string? unitA, string nameB, string? brandB, string? unitB) =>
        SimilarBucket(nameA, unitA) == SimilarBucket(nameB, unitB) && BrandsCompatible(brandA, brandB);
}
