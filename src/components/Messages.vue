<template>
  <v-card flat>
    <div id="container" class="chat-container rounded" @scroll="onScroll">
      <ul class="pb-10 pl-0">
        <li
          v-for="message in messages"
          :key="message.entry.uuid"
          class="message"
        >
          <Message
            :message="message"
            :key="message.entry.uuid"
            :isMine="isMyMessage(message)"
          />
        </li>
      </ul>
    </div>
    <v-card-actions class="pa-0 pt-1">
      <Message :handleCreateMessage="handleCreateMessage" />
    </v-card-actions>
  </v-card>
</template>
<script>
import { mapActions, mapState, mapGetters } from 'vuex'
import { arrayBufferToBase64 } from '@/store/utils'

export default {
  name: 'Messages',
  components: {
    Message: () => require('./Message.vue')
  },
  data () {
    return {
      userIsScrolling: false
    }
  },
  methods: {
    ...mapActions('elementalChat', ['createMessage']),
    handleCreateMessage (content) {
      this.createMessage({
        channel: this.channel,
        content
      })
    },
    onScroll () {
      this.userIsScrolling = true
      const container = this.$el.querySelector('#container')
      const height = container.offsetHeight + container.scrollTop

      if (height === container.scrollHeight) {
        this.userIsScrolling = false
      }
    },
    scrollToEnd () {
      if (this.userIsScrolling) return
      const container = this.$el.querySelector('#container')
      container.scrollTop = container.scrollHeight
    },
    isMyMessage (message) {
      return arrayBufferToBase64(message.createdBy) === arrayBufferToBase64(this.agentKey)
    }
  },
  computed: {
    ...mapState('holochain', ['conductorDisconnected', 'agentKey']),
    ...mapGetters('elementalChat', ['channel']),
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
}
</script>
<style>
.chat-container {
  box-sizing: border-box;
  overflow-y: auto;
  height: calc(100vh - 218px);
}
.my-message {
  background-color: red;
}
ul {
  list-style-type: none;
}
</style>
