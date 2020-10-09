<template>
  <v-card flat>
    <div id="container" class="chat-container rounded">
      <ul class="pb-10 pl-0">
        <li v-for="(message, i) in channel.messages" :key="i" class="message">
          <message :message="message" mode="display" />
        </li>
      </ul>
    </div>
    <v-card-actions class="pa-0 pt-1">
      <message mode="create" @message-created="messageCreated" />
    </v-card-actions>
  </v-card>
</template>
<script>
import { mapActions } from "vuex";
export default {
  name: "Messages",
  components: {
    Message: () => import("./Message.vue")
  },
  props: ["channel"],
  methods: {
    ...mapActions("elementalChat", ["addMessageToChannel"]),
    messageCreated(message) {
      console.log(this.channel);
      if (this.channel.last_seen === undefined)
        this.channel.last_seen = { First: null };
      this.addMessageToChannel({
        last_seen: this.channel.last_seen,
        channel: this.channel.channel,
        message: message
      }).then(() => {
        this.scrollToEnd();
      });
    },
    scrollToEnd: function() {
      var container = this.$el.querySelector("#container");
      container.scrollTop = container.scrollHeight;
    }
  },
  computed: {
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
