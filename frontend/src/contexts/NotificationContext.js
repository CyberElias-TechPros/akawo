import React, { createContext, useState, useContext } from 'react';
import Notification from '../components/Notification';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setNotifications(prevNotifications => [
            ...prevNotifications,
            { id, message, type, duration }
        ]);

        setTimeout(() => {
            setNotifications(prevNotifications =>
                prevNotifications.filter(notification => notification.id !== id)
            );
        }, duration);
    };

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <div className="notification-container">
                {notifications.map(notification => (
                    <Notification key={notification.id} {...notification} />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
