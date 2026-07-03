import { useCallback, useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import type { Ticket } from "../@types";

interface QueueEvents {
  onTicketCreated?: (ticket: Ticket) => void;
  onTicketCalled?: (ticket: Ticket) => void;
  onTicketStarted?: (ticket: Ticket) => void;
  onTicketCompleted?: (ticket: Ticket) => void;
  onTicketNoShow?: (ticket: Ticket) => void;
  onTicketTransferred?: (ticket: Ticket) => void;
}

export const useSignalR = (agencyId: number, events: QueueEvents) => {
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const connect = useCallback(async () => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5180/hubs/queue", {
        accessTokenFactory: () => localStorage.getItem("qora_token") || "",
      })
      .withAutomaticReconnect()
      .build();

    // Enregistrer les événements
    if (events.onTicketCreated)
      connection.on("TicketCreated", events.onTicketCreated);
    if (events.onTicketCalled)
      connection.on("TicketCalled", events.onTicketCalled);
    if (events.onTicketStarted)
      connection.on("TicketStarted", events.onTicketStarted);
    if (events.onTicketCompleted)
      connection.on("TicketCompleted", events.onTicketCompleted);
    if (events.onTicketNoShow)
      connection.on("TicketNoShow", events.onTicketNoShow);
    if (events.onTicketTransferred)
      connection.on("TicketTransferred", events.onTicketTransferred);

    await connection.start();

    // Rejoindre le groupe de l'agence
    await connection.invoke("JoinGroup", `agency-${agencyId}`);

    connectionRef.current = connection;
  }, [agencyId]);

  useEffect(() => {
    connect();

    return () => {
      connectionRef.current?.stop();
    };
  }, [connect]);

  return connectionRef;
};
