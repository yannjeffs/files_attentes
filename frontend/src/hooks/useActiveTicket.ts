import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Ticket } from '../@types';

// Fonction d'initialisation — exécutée une seule fois au montage
const getInitialTicket = (): Ticket | null => {
  const stored = localStorage.getItem('qora_active_ticket');
  if (!stored) return null;

  const ticket = JSON.parse(stored) as Ticket;
  if (ticket.status === 'Waiting' || ticket.status === 'Called') {
    return ticket;
  }

  localStorage.removeItem('qora_active_ticket');
  return null;
};

export const useActiveTicket = () => {
  // Initialisation directe depuis localStorage — pas de useEffect nécessaire
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(getInitialTicket);
  const [isCalled, setIsCalled] = useState<boolean>(
    () => getInitialTicket()?.status === 'Called'
  );
  const [calledCounter, setCalledCounter] = useState<number | null>(null);

  // Suite du hook — useEffect SignalR uniquement
  useEffect(() => {
  if (!activeTicket) return;

  let stopped = false;
  
  const connection = new signalR.HubConnectionBuilder()
    .withUrl('http://localhost:5180/hubs/queue')
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  connection.on('TicketCalled', (calledTicket: Ticket) => {
    if (calledTicket.ticketNumber === activeTicket.ticketNumber) {
      setIsCalled(true);
      setCalledCounter(calledTicket.counterNumber ?? null);
      setActiveTicket((prev) =>
        prev ? { ...prev, status: 'Called' } : prev
      );
      localStorage.removeItem('qora_active_ticket');

      if (Notification.permission === 'granted') {
        new Notification("🔔 C'est votre tour !", {
          body: `Présentez-vous au guichet ${calledTicket.counterNumber}. Ticket : ${calledTicket.ticketNumber}`,
          icon: '/favicon.ico',
        });
      }
    }
  });

  const start = async () => {
    try {
      await connection.start();
      if (stopped) {
        // Cleanup déclenché avant la fin de la connexion — on arrête proprement
        await connection.stop();
        return;
      }
      await connection.invoke('JoinGroup', `agency-1`);
    } catch (err) {
      // Connexion échouée ou stoppée — on ignore silencieusement
      if (!stopped) {
        console.warn('SignalR — connexion échouée :', err);
      }
    }
  };

  start();

  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }

  return () => {
    stopped = true;
    connection.stop();
  };
}, [activeTicket?.ticketNumber, activeTicket]);

  const clearActiveTicket = () => {
    localStorage.removeItem('qora_active_ticket');
    setActiveTicket(null);
    setIsCalled(false);
    setCalledCounter(null);
  };

  return { activeTicket, isCalled, calledCounter, clearActiveTicket };
};