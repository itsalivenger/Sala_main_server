import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export const sendPushNotification = async (pushToken: string, title: string, body: string, data?: any) => {
    if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        return;
    }

    const messages: ExpoPushMessage[] = [{
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
    }];

    try {
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
                console.log('[PUSH] Notification sent successfully');
            } catch (error) {
                console.error('[PUSH] Error sending chunk:', error);
            }
        }

        return tickets;
    } catch (error) {
        console.error('[PUSH] Error in sendPushNotification:', error);
    }
};
