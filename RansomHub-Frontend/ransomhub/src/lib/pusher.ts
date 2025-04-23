// src/lib/pusher.ts
import Pusher from 'pusher-js';

const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  forceTLS: true
});

export const subscribeToChannel = (channelName: string, callback: (data: any) => void) => {
  const channel = pusherClient.subscribe(channelName);
  channel.bind('message', callback);
  
  return () => {
    channel.unbind_all();
    channel.unsubscribe();
  };
};

// export const triggerEvent = (channelName: string, eventName: string, data: any) => {
//   pusherClient.trigger(channelName, eventName, data);
// };