import React, { useEffect, useState } from 'react';
import PubNub from 'pubnub';
import { usePubNub } from 'pubnub-react';
import MessageContainer from './MessageContainer';
import ChatInput from './ChatInput';
import Header from './Header';
import ScreenName from './ScreenName';
import JoinCreateRoom from './JoinCreateRoom';
import '../styles/message.css';
import '../styles/chatRoom.css';

interface MessageObj {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
    screenName: string;
}

const ChatRoom = () => {
    const pubnub = usePubNub();
    const [messages, setMessages] = useState<MessageObj[]>([]);
    const [channel, setChannel] = useState<string>('');
    const [roomCode, setRoomCode] = useState<string>('');
    const [screenName, setScreenName] = useState<string>('');
    const [isScreenNameEntered, setIsScreenNameEntered] = useState<boolean>(false);
    const [currentUserId, setCurrentUserId] = useState<string>(() => localStorage.getItem('currentUserId') || '');

    useEffect(() => {
        if (!currentUserId) {
            const userId = pubnub.getUUID(); 
            localStorage.setItem('currentUserId', userId);
            setCurrentUserId(userId);
        }
    }, [pubnub, currentUserId]);

    useEffect(() => {
        // useEffect for persistence
        const storedRoomCode = localStorage.getItem('chatRoomCode');
        const storedScreenName = localStorage.getItem('screenName');

        if (storedScreenName) {
            setScreenName(storedScreenName);
            setIsScreenNameEntered(true);
        }

        if (storedRoomCode) {
            setChannel(storedRoomCode);
            setRoomCode(storedRoomCode);
        }
    }, []);

    useEffect(() => {
         
        if (!channel) return;

        pubnub.subscribe({ channels: [channel] });
        fetchHistory();

        const handleMessage = (event: PubNub.MessageEvent) => {
            const newMessage: MessageObj = {
                id: event.message.id,
                text: event.message.text,
                senderId: event.message.senderId,
                timestamp: new Date(Number(event.timetoken) / 10000),
                screenName: event.message.screenName
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
        };
    }, [pubnub, channel]);

    const fetchHistory = () => {
        pubnub.fetchMessages({
            channels: [channel],
            count: 100  // Number of messages to retrieve
        }).then((response) => {
            const historicalMessages = response.channels[channel].map(msgEvent => ({
                id: msgEvent.message.id,
                text: msgEvent.message.text,
                senderId: msgEvent.message.senderId,
                screenName: msgEvent.message.screenName,
                timestamp: new Date(Number(msgEvent.timetoken) / 10000)
            }));
            setMessages(historicalMessages);
        }).catch(error => console.error('Error fetching historical messages:', error));
    };


    const handleScreenNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setScreenName(event.target.value);
    };

    const handleSubmitName = () => {
        if (screenName.trim().length >= 3) {
            setIsScreenNameEntered(true);
            localStorage.setItem('screenName', screenName);
        } else {
            alert("Screen name must contain at least 3 characters and no spaces");
        }
    };
    

    const handleChangeName = () => {
        setIsScreenNameEntered(false);
        localStorage.removeItem('screenName'); 
    };

    const sendMessage = (message: string): void => {
        if (channel && isScreenNameEntered) {
            const messagePayload = {
                id: Date.now().toString(),
                text: message,
                senderId: currentUserId,
                screenName: screenName, 
                timestamp: new Date()
            };
            pubnub.publish({ channel, message: messagePayload });
        }
    };

    const subscribeToChannel = () => {
        pubnub.addListener({
            message: handleMessage
        });
    
        pubnub.subscribe({ channels: [channel] });
    };

    const handleMessage = (event: PubNub.MessageEvent) => {
        const newMessage = {
            id: event.message.id,
            text: event.message.text,
            senderId: event.message.senderId,
            screenName: event.message.screenName,
            timestamp: new Date(Number(event.timetoken) / 10000)
        };
    
        setMessages(prevMessages => [...prevMessages, newMessage]);
    };


    const handleJoinRoom = async () => {
        if (roomCode.trim() && isScreenNameEntered) {
            const isValid = await checkRoomValidity(roomCode.trim());
            if (isValid) {
                setChannel(roomCode.trim());
                // using localStorage to set creator
                localStorage.setItem('chatRoomCode', roomCode.trim());
            } else {
                alert('Invalid room code');
            }
        }
    };

    const handleCreateRoom = () => {
        const newRoomCode = `BirdNest-${Date.now()}`;
        if (isScreenNameEntered) {
            setChannel(newRoomCode);
            setRoomCode(newRoomCode);
            localStorage.setItem('chatRoomCode', newRoomCode);
        }
    };

    const checkRoomValidity = async (code: string): Promise<boolean> => {
        let isValid = false;
        try {
            //From documentation: When a client opens the app, it's often required to discover what other users are already subscribed to that channel (for example, to construct a chat room's online friends list). You can obtain a list of client User IDs, including clients' state data, and the total occupancy of the channel using the Here Now API.
            //https://www.pubnub.com/docs/general/presence/overview
            const response = await pubnub.hereNow({
                channels: [code],
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
        alert('You have left the chat session.');
    };

    return (
        <div>
            {!channel && (
            <div className="join-create-screen">
                
                {!isScreenNameEntered ? (
                    <ScreenName
                        screenName={screenName}
                        handleScreenNameChange={handleScreenNameChange}
                        handleSubmitName={handleSubmitName}
                    />
                ) : (
                    <JoinCreateRoom
                        screenName={screenName}
                        roomCode={roomCode}
                        isScreenNameEntered={isScreenNameEntered}
                        setRoomCode={setRoomCode}
                        handleJoinRoom={handleJoinRoom}
                        handleCreateRoom={handleCreateRoom}
                        handleChangeName={handleChangeName}
                    />
                )}
            </div>

            )}
            {channel && (
                <>
                    <Header 
                        channel={channel} 
                        onLeaveSession={handleLeaveSession}
                    />

                    <MessageContainer messages={messages} currentUserId={currentUserId}/>

                    <ChatInput onSendMessage={sendMessage} />
                </>
            )}
        </div>
    );
};

export default ChatRoom;