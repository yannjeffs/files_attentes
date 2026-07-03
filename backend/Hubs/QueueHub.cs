using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs;

public class QueueHub : Hub
{
    // Appelé quand un client se connecte
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    // Appelé quand un client se déconnecte
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }

    // Rejoindre un groupe (ex: agence, service)
    public async Task JoinGroup(string groupName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    }

    // Quitter un groupe
    public async Task LeaveGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }
}
