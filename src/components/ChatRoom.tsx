import React, { useEffect, useState } from 'react';
import PubNub from 'pubnub';
import { usePubNub } from 'pubnub-react';
import Message from './Message'; 
import ChatInput from './ChatInput';
import Header from './Header';
import '../styles/message.css';
import '../styles/chatRoom.css';

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
}

// want a functionality to add a screen name and cant join or create until one is created
// clean up header styles between header component and chatRoom component styles 
// clear up the leave session and end session bug 

const ChatRoom = () => {
    const pubnub = usePubNub();
    const [messages, setMessages] = useState<Message[]>([]);
    const [channel, setChannel] = useState<string>('');
    const [roomCode, setRoomCode] = useState<string>('');
    const [isCreator, setIsCreator] = useState<boolean>(false);


    useEffect(() => {
        // useEffect for persistence
         
        const storedRoomCode = localStorage.getItem('chatRoomCode');
        const storedIsCreator = localStorage.getItem('isCreator') === 'true';
        console.log("in useEffect for Persistence ///////")
        console.log("storedRoomCode : " + storedRoomCode)
        console.log("storedIsCreator : " + storedIsCreator)
        console.log("////// ////// ///////")

        if (storedRoomCode) {
            setChannel(storedRoomCode);
            setRoomCode(storedRoomCode);
            setIsCreator(storedIsCreator);
        }
    }, []);

    useEffect(() => {
         
        if (!channel) return;

        const handleMessage = (event: PubNub.MessageEvent) => {
            const newMessage: Message = {
                id: event.message.id,
                text: event.message.text,
                senderId: event.message.senderId,
                timestamp: new Date(Number(event.timetoken) / 10000)
            };
            console.log("Received message:", event.message);
            setMessages(prevMessages => {
                const exists = prevMessages.find(msg => msg.id === newMessage.id);
                return exists ? prevMessages : [...prevMessages, newMessage];
            });
            
        };

        pubnub.addListener({ message: handleMessage });
        pubnub.subscribe({ channels: [channel] });

        return () => {
            pubnub.removeListener({ message: handleMessage });
            pubnub.unsubscribeAll();
            localStorage.removeItem('chatRoomCode');  
            localStorage.removeItem('isCreator');
        };
    }, [pubnub, channel]);

    const sendMessage = (message: string): void => {
        if (channel) {
            pubnub.publish({
                channel: channel,
                message: { id: Date.now().toString(), text: message, senderId: 'senderID', timestamp: new Date() }
            }).then((response: PubNub.PublishResponse) => {
                console.log("Message Published", response);
            }).catch((error: Error) => {
                console.error("Failed to publish message", error);
            });
        }
    };

    const handleJoinRoom = async () => {
        if (roomCode.trim()) {
            const isValid = await checkRoomValidity(roomCode.trim());
            if (isValid) {
                setChannel(roomCode.trim());
                // using localStorage to set creator
                localStorage.setItem('chatRoomCode', roomCode.trim());
                localStorage.setItem('isCreator', 'false');
                // 
                console.log("////////////in handlejoinroom///////////////////")
                console.log("isCreator: " + localStorage.isCreator )
                console.log("chatRoomCode: " + localStorage.chatRoomCode)
                console.log("/////////////////////////////////////")
            } else {
                alert('Invalid room code');
            }
        }
    };

    const handleCreateRoom = () => {
        const newRoomCode = `BirdNest-${Date.now()}`;
        setChannel(newRoomCode);
        setRoomCode(newRoomCode);
        // Save the new room code
         
        localStorage.setItem('chatRoomCode', newRoomCode);
        localStorage.setItem('isCreator', 'true');
    };

    const checkRoomValidity = async (code: string): Promise<boolean> => {
        let isValid = false;
        try {
            //From documentation: When a client opens the app, it's often required to discover what other users are already subscribed to that channel (for example, to construct a chat room's online friends list). You can obtain a list of client User IDs, including clients' state data, and the total occupancy of the channel using the Here Now API.
            //https://www.pubnub.com/docs/general/presence/overview
            const response = await pubnub.hereNow({
                channels: [code],
                // includeUUIDs: false, /// keeping this for use later, look up
                includeState: false
            });
    
            // checking channel exists and users present
            if (response && response.totalOccupancy > 0) {
                isValid = true; 
            }
        } catch (error) {
            console.error('Failed to check room validity:', error);
        }
        return isValid;
    };

    const handleEndSession = () => {
        pubnub.unsubscribe({ channels: [channel] });
        setChannel('');
        setRoomCode('');
        setMessages([]);
         
        localStorage.removeItem('chatRoomCode');  
        localStorage.removeItem('isCreator');
         
        alert('Chat session ended.');
    };

    const handleLeaveSession = () => {
        pubnub.unsubscribe({
            channels: [channel]
        });
        setChannel('');
        setRoomCode('');
        setMessages([]);
        // this is used to stop auto-rejoin / persistence on refresh
         
        localStorage.removeItem('chatRoomCode'); 
        localStorage.removeItem('isCreator');
         
        alert('You have left the chat session.');
    };

    return (
        <div>
            {!channel && (
            <>
                <h1>Yellow Bird Chat</h1>
                <div className="join-section">
                    <input
                        type="text"
                        className="join-input"
                        placeholder="room code"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                    />
                    <button className="join-button" onClick={handleJoinRoom}>Join Friends!</button>
                </div>
                <div>
                    <hr></hr>
                    <button className="create-button" onClick={handleCreateRoom}>Create Room</button>
                </div>

            </>

            )}
            {channel && (
                <>
                    <Header 
                        channel={channel} 
                        isCreator={isCreator} 
                        onEndSession={handleEndSession} 
                        onLeaveSession={handleLeaveSession}
                    />

                    <ul>
                        {messages.map((message) => (
                            <li key={message.id}>
                                <Message message={message} />
                            </li>
                        ))}
                    </ul>

                    <ChatInput onSendMessage={sendMessage} />
                </>
            )}
        </div>
    );
};

export default ChatRoom;


                    // <div className="header">
                    //     <div className="title">Yellow Bird Chatter</div>
                    //     <div className="room-code">Room Code: {channel}</div>
                    //     {isCreator ? (
                    //         <button className="end-session-button" onClick={handleEndSession}>End Session</button>
                    //     ) : (
                    //         <button className="leave-session-button" onClick={handleLeaveSession}>Leave Session</button>
                    //     )}
                    // </div>
