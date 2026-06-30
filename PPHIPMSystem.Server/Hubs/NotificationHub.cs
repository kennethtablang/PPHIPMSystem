using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PPHIPMSystem.Server.Hubs;

[Authorize]
public class NotificationHub : Hub
{
}
