import React, { useEffect, useState } from 'react';
import PubNub from 'pubnub';
import { usePubNub } from 'pubnub-react';

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
}

const ChatRoom = () => {
    const pubnub = usePubNub();
    const [messages, setMessages] = useState<Message[]>([]);
    const [channel] = useState<string>('yellowBirdChat');

    useEffect(() => {
        // debugger
        const handleMessage = (event: PubNub.MessageEvent) => {
            const newMessage: Message = {
                id: event.message.id,
                text: event.message.text,
                senderId: event.message.senderId,
                timestamp: new Date(Number(event.timetoken) / 10000)
            };
            console.log("Received message:", event.message);
            setMessages(prevMessages => [...prevMessages, newMessage]);
        };

        pubnub.addListener({ message: handleMessage });
        pubnub.subscribe({ channels: [channel] });

        return () => pubnub.unsubscribeAll();
    }, [pubnub, channel]);

    // useEffect(() => {
    //     function handleMessage(event) {
    //         console.log('Received:', event.message);
    //     }
    
    //     pubnub.addListener({ message: handleMessage });
    //     pubnub.subscribe({ channels: ['yellowBirdChat'] });
    
    //     return () => {
    //         pubnub.unsubscribeAll();
    //     };
    // }, []);

    // function sendMessage(message: string) void {
    //     // debugger
    //     pubnub.publish({
    //         channel: 'yellowBirdChat',
    //         message: message
    //     });
    // }

    function sendMessage(message: string): void {
        // debugger; 
        pubnub.publish({
            channel: 'yellowBirdChat',
            message: { id: Date.now().toString(), text: message, senderId: 'senderID', timestamp: new Date() }
        }).then((response: PubNub.PublishResponse) => {
            console.log("Message Published", response);
        }).catch((error: Error) => {
            console.error("Failed to publish message", error);
        });
    }


    return (
        <div>
            <h1>Chat Room</h1>
            <ul>
                {messages.map((message) => (
                    <li key={message.id}>
                        {message.senderId}: {message.text} ({message.timestamp.toLocaleTimeString()})
                    </li>
                ))}
            </ul>
            <button onClick={() => sendMessage("Hello World!")}>Send Message</button>
        </div>
    );
};

export default ChatRoom;
