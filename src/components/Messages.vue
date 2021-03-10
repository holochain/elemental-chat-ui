<template>
  <v-card flat>
    <div id="container" class="chat-container rounded" @scroll="onScroll">
      <ul class="pb-10 pl-0">
        <li
          v-for="message in messages"
          :key="message.message.uuid"
          class="message"
        >
          <Message
            :message="message"
            :key="message.message.uuid"
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

export default {
  name: 'Messages',
  components: {
    Message: () => import('./Message.vue')
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
    }
  },
  computed: {
    ...mapState('holochain', ['conductorDisconnected']),
    ...mapGetters('elementalChat', ['channel']),
    messages () {
      return this.channel.messages
    }
  },
  watch: {
    channel () {
      this.scrollToEnd()
    },
    userIsScrolling (val) {
      console.log('user is scrolling', val)
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
ul {
  list-style-type: none;
}
</style>
