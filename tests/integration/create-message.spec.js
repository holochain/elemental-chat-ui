// import { fireEvent, within, act, wait } from '@testing-library/vue'
// import msgpack from '@msgpack/msgpack'
import { v4 as uuidv4 } from "uuid";
// import waait from 'waait'
// import { renderAndWait } from '../utils'
import { orchestrator, conductorConfig, elChatDna } from "./setup/tryorama";
// import HApp from '@/applications/ElementalChat/views/ElementalChat.vue'

orchestrator.registerScenario("New Message Scenario", async s => {
  const [conductor] = await s.players([conductorConfig]);
  // install app into tryorama conductor
  const [[chatter1Happ], [chatter2Happ]] = await conductor.installAgentsHapps([
    [[elChatDna]],
    [[elChatDna]]
  ]);
  // destructure and define agents
  const [chatter1] = chatter1Happ.cells;
  console.log(chatter1);
  const [chatter2] = chatter2Happ.cells;
  console.log(chatter2);

  // Create a channel
  const channelId = uuidv4();
  const channel = await chatter1.call("chat", "create_channel", {
    name: "Test Channel",
    channel: { category: "General", uuid: channelId }
  });
  console.log(channel);

  const message = {
    last_seen: { First: null },
    channel: channel.channel,
    chunk: 0,
    message: {
      uuid: uuidv4(),
      content: "Hello from alice :)"
    }
  };

  // chatter1 sends a message
  const returnedMessage = await chatter1.call(
    "chat",
    "create_message",
    message
  );
  
/* eslint no-undef: "error" */
/* eslint-env node */
it("returns message", () => {
    console.log(returnedMessage);
  });
});

orchestrator.run();
