<template>
  <v-card flat>
    <div id="container" class="chat-container rounded" @scroll="personScroll">
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
import { mapActions, mapState } from 'vuex'

export default {
  name: 'Messages',
  components: {
    Message: () => import('./Message.vue')
  },
  data () {
    return {
      personScrolling: false
    }
  },
  methods: {
    ...mapActions('elementalChat', ['addMessageToChannel']),
    messageCreated (message) {
      this.addMessageToChannel({
        channel: this.channel,
        message: message
      })
    },
    personScroll () {
      var container = this.$el.querySelector('#container')
      container.onscroll = () => {
        this.personScrolling = true
        const height = container.offsetHeight + container.scrollTop
        if (height === container.scrollHeight) {
          this.personScrolling = false
        }
      }
    },
    scrollToEnd () {
      if (this.personScrolling) return
      var container = this.$el.querySelector('#container')
      container.scrollTop = container.scrollHeight
    }
  },
  computed: {
    ...mapState('holochain', ['conductorDisconnected']),
    ...mapState('elementalChat', ['channel']),
    messages () {
      return this.channel.messages
    }
  },
  watch: {
    channel () {
      this.scrollToEnd()
    }
  },
  mounted () {
    this.scrollToEnd()
  }
};
</script>
<style>
.chat-container {
  box-sizing: border-box;
  overflow-y: auto;
  height: calc(100vh - 218px);
}
ul {
  list-style-type: none;
}
</style>
