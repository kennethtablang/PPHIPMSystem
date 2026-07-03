namespace PPHIPMSystem.Server.DTOs.Common;

// Envelope for server-side paging on unbounded tables.
public class PagedResultDto<T>
{
    public IEnumerable<T> Items { get; set; } = [];
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
