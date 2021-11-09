<template>
  <v-card flat>
    <div id="container" class="chat-container rounded" @scroll="onScroll" aria-label="Message Container">
      <v-card style="display: grid" aria-label='Load More'>
        <v-btn v-if='!listMessagesLoading' text @click="loadMoreMessages" class='pagination-button' aria-label="Load More Button">
          Load More Messages
        </v-btn>
      <div><Spinner v-if='listMessagesLoading' size='18px' class='message-subheader' /></div>
      <div><p size='18px' class='message-subheader'>{{ this.presentedEarliestDate }}</p></div>
      </v-card>
      <ul class="pb-10 pl-0" aria-label="Message List">
        <li
          v-for="message in messages"
          :key="message.entry.uuid"
          :id="message.entry.uuid"
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
    <v-card-actions class="pa-0 pt-1" aria-label="New Message Card">
      <Message :handleCreateMessage="handleCreateMessage" />
    </v-card-actions>
  </v-card>
</template>
<script>
import { mapActions, mapState, mapGetters } from 'vuex'
import { arrayBufferToBase64, presentPaginationDateTime } from '@/store/utils'
import Message from './Message.vue'
import Spinner from './Spinner'

export default {
  name: 'Messages',
  components: {
    Message, 
    Spinner
  },
  data () {
    return {
      userIsScrolling: false,
      lastSeenMsgId: null,
    }
  },
  computed: {
    ...mapState('holochain', ['conductorDisconnected', 'agentKey']),
    ...mapGetters('elementalChat', ['channel', 'listMessagesLoading', 'createMessageLoading']),
    messages () {
      return this.channel.messages
    },
    earliestDate () {
      // TODO: this should always return a date. the false clause should return now
      return this.messages[0]
        ? this.messages[0].createdAt
        : (Date.now() * 1000)
    },
    presentedEarliestDate () {
      return presentPaginationDateTime(this.earliestDate)
    }
  },
  methods: {
    ...mapActions('elementalChat', ['createMessage', 'listMessagesPage']),
    handleCreateMessage (content) {
      this.scrollToEnd()
      this.createMessage({
        channel: this.channel,
        content
      })
    },
    onScroll () {
      const container = this.$el.querySelector('#container')

      this.userIsScrolling = true
      const height = container.offsetHeight + Math.abs(container.scrollTop)
      if (height === container.scrollHeight) {
        this.userIsScrolling = false
      }
    },
    scrollToEnd () {
      if (this.userIsScrolling) return
      const container = this.$el.querySelector('#container')
      container.scrollTop = container.scrollHeight
    },
    scrollToMessage (id) {
      if (!id) return
      const container = this.$el.querySelector('#container')
      container.scrollTop = 0
      const messageElement = document.getElementById(id)
      const offset = messageElement.getBoundingClientRect().top - messageElement.offsetParent.getBoundingClientRect().top
      container.scrollTop = offset - 100
    },
    async loadMoreMessages () {
      const lastSeenMsgId = this.messages[0] ? this.messages[0].entry.uuid : null
      await this.listMessagesPage({
        channel: this.channel,
        earlier_than: this.earliestDate - (60 * 60 * 1000 * 1000), // TODO: this is a hack to work around a dna bug. This should be removed once that bug is fixed
        target_message_count: 20,
        active_chatter: true
      })
      this.scrollToMessage(lastSeenMsgId)
    },
    isMyMessage (message) {
      return arrayBufferToBase64(message.createdBy) === arrayBufferToBase64(this.agentKey)
    }
  },
  watch: {
    channel () {
      this.scrollToEnd()
    },
    createMessageLoading (isLoading) {
      if (!isLoading) {
        this.userIsScrolling = false
        this.scrollToEnd()
      }
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
.pagination-button {
  padding: 0 38px;
  margin: 0 auto;
  margin-top: 10px;
  border: 2px solid #d7ea44;
}
.message-subheader {
  display: grid;
  margin: 0 auto;
  margin-top: 10px;
  justify-content: center;
}
</style>
