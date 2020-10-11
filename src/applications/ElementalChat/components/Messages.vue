<template>
  <v-card flat>
    <div id="container" class="chat-container rounded">
      <ul class="pb-10 pl-0">
        <li
          v-for="message in messages"
          :key="message.message.uuid"
          class="message"
        >
          <message
            :message="message"
            :key="message.message.uuid"
            mode="display"
          />
        </li>
      </ul>
    </div>
    <v-card-actions class="pa-0 pt-1">
      <message mode="create" @message-created="messageCreated" />
    </v-card-actions>
  </v-card>
</template>
<script>
import { mapActions, mapState } from "vuex";
export default {
  name: "Messages",
  components: {
    Message: () => import("./Message.vue")
  },
  methods: {
    ...mapActions("elementalChat", ["addMessageToChannel"]),
    messageCreated(message) {
      if (this.channel.last_seen === undefined) {
        this.channel.last_seen = { First: null };
      }
      this.addMessageToChannel({
        channel: this.channel,
        message: message
      }).then(() => {
        this.scrollToEnd();
      });
    },
    scrollToEnd() {
      var container = this.$el.querySelector("#container");
      container.scrollTop = container.scrollHeight;
    }
  },
  computed: {
    ...mapState(["connectedToHolochain", "today"]),
    ...mapState("elementalChat", ["channel"]),
    messages() {
      return this.channel.messages;
    }
  }
};
</script>
<style>
.chat-container {
  box-sizing: border-box;
  overflow-y: auto;
  height: calc(100vh - 150px);
}
ul {
  list-style-type: none;
}
</style>
