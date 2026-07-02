import * as signalR from '@microsoft/signalr';

// Same-origin by default: /hubs is proxied to the API by Vite in dev
// (see vite.config.js) and served by the API host itself in production.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class SignalRService {
    constructor() {
        this.notificationConnection = null;
        this.forecastConnection = null;
    }

    startNotificationConnection() {
        if (this.notificationConnection) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        this.notificationConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${BASE_URL}/hubs/notifications`, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        this.notificationConnection.start()
            .catch(err => console.error('Error starting Notification SignalR connection:', err));
    }

    startForecastConnection() {
        if (this.forecastConnection) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        this.forecastConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${BASE_URL}/hubs/forecast`, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        this.forecastConnection.start()
            .catch(err => console.error('Error starting Forecast SignalR connection:', err));
    }

    onNotificationReceived(callback) {
        if (this.notificationConnection) {
            this.notificationConnection.on('ReceiveNotification', callback);
        }
    }

    offNotificationReceived(callback) {
        if (this.notificationConnection) {
            this.notificationConnection.off('ReceiveNotification', callback);
        }
    }

    onForecastUpdated(callback) {
        if (this.forecastConnection) {
            this.forecastConnection.on('ReceiveForecastUpdate', callback);
        }
    }

    offForecastUpdated(callback) {
        if (this.forecastConnection) {
            this.forecastConnection.off('ReceiveForecastUpdate', callback);
        }
    }

    stopConnections() {
        if (this.notificationConnection) {
            this.notificationConnection.stop();
            this.notificationConnection = null;
        }
        if (this.forecastConnection) {
            this.forecastConnection.stop();
            this.forecastConnection = null;
        }
    }
}

export const signalRService = new SignalRService();
