const Pusher = require("pusher-js");

const pusher = new Pusher("8f6f12497ce080d72d54", {
  cluster: "ap2",
});

const channel = pusher.subscribe("bb2525d5dc54");
channel.bind("group_message", (data) => {
  console.log("Received event:", data);
});
