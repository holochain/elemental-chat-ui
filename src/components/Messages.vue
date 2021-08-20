<template>
  <v-card flat>
    <div id="container" class="chat-container rounded" @scroll="onScroll" aria-label="Message Container">
      <v-card v-if="shouldLoadMore" style="display: grid" aria-label='Load More'>
        <v-btn v-if='!listMessagesLoading' text @click="loadMoreMessages" aria-label="Load More Button">
          Load More Messages
        </v-btn>
      <div><Spinner v-if='listMessagesLoading' size='18px' class='message-subheader' /></div>
      <div><p size='18px' class='message-subheader'>{{ this.earliestDate }}</p></div>
      </v-card>
      <ul class="pb-10 pl-0" aria-label="Message List">
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
    <v-card-actions class="pa-0 pt-1" aria-label="New Message Card">
      <Message :handleCreateMessage="handleCreateMessage" />
    </v-card-actions>
  </v-card>
</template>
<script>
import { mapActions, mapState, mapGetters } from 'vuex'
import { arrayBufferToBase64 } from '@/store/utils'
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
      showLoadButton: false,
      earliestDate: 'August 20 2021'
    }
  },
  computed: {
    ...mapState('holochain', ['conductorDisconnected', 'agentKey']),
    ...mapGetters('elementalChat', ['channel', 'listMessagesLoading']),
    messages () {
      return this.channel.messages
    },
    shouldLoadMore () {
      return this.showLoadButton
    }
  },
  methods: {
    ...mapActions('elementalChat', ['createMessage', 'getMessageChunk']),
    handleCreateMessage (content) {
      this.createMessage({
        channel: this.channel,
        content
      })
    },
    onScroll () {
      this.userIsScrolling = true
      const container = this.$el.querySelector('#container')
      this.showLoadButton = container.scrollTop === 0 && (this.channel.messages.length !== this.channel.totalMessageCount)
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
    loadMoreMessages () {
      this.showLoadButton = false
      this.getMessageChunk({
          channel: this.channel,
          latestChunk: this.channel.latestChunk,
          activeChatter: true
      })
    },
    isMyMessage (message) {
      return arrayBufferToBase64(message.createdBy) === arrayBufferToBase64(this.agentKey)
    }
  },
  watch: {
    channel () {
      this.scrollToEnd()
    },
    showLoadButton () {
      const container = this.$el.querySelector('#container')
      this.showLoadButton = container.scrollTop === 0 && (this.channel.messages.length !== this.channel.totalMessageCount)
    }
  },
  mounted () {
    this.scrollToEnd()
    console.log('messages list : ', this.messages)
    if (this.messages && this.messages.length > 0) {
      const convertedDate = new Date(this.messages[0].createdAt)
      console.log(';;;;;;;>>>>> ', convertedDate)
      this.earliestDate = this.messages[0].createdAt
    }
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
.message-subheader {
  display: grid;
  margin: 0 auto;
  justify-content: center;
}
</style>
