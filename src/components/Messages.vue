<template>
  <v-card flat>
    <div id="container" class="chat-container rounded" @scroll="onScroll" aria-label="Message Container">
      <v-card v-if="shouldLoadMore" style="display: grid" aria-label='Load More'>
        <v-btn v-if='!listMessagesLoading' text @click="loadMoreMessages" class='pagination-button' aria-label="Load More Button">
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
import { CHUNK_COUNT } from '@/store/elementalChat'
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
      earliestDate: ''
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
      // console.log('container.scrollTop === 0 : ', container.scrollTop === 0)
      // console.log('this.channel.currentMessageCount : ', this.channel.currentMessageCount)
      // console.log('this.channel.totalMessageCount : ', this.channel.totalMessageCount)

      this.showLoadButton = container.scrollTop === 0 && (this.channel.currentMessageCount !== this.channel.totalMessageCount)
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
      if (this.messages && this.messages.length > 0) {
        const convertedDatetime = new Date(this.messages[0].createdAt[0] * 1000)
        this.earliestDate = `${convertedDatetime.toLocaleString('default', { month: 'long' })} ${convertedDatetime.getDate()} ${convertedDatetime.getFullYear()}`
      }
    },
    listMessagesLoading () {
      // NB: we add the chunk value here, bc at the time of the fn return the channel has not been updated with new sum
      // console.log(' >>>>>>> this.channel.currentMessageCount : ', this.channel.currentMessageCount)
      // console.log(' >>>>>>> this.channel.totalMessageCount : ', this.channel.totalMessageCount)
      if ((this.channel.currentMessageCount + CHUNK_COUNT) === this.channel.totalMessageCount) {
        this.showLoadButton = false
      } else if (this.channel.messages) {
        const convertedDatetime = new Date(this.messages[0].createdAt[0] * 1000)
        this.earliestDate = `${convertedDatetime.toLocaleString('default', { month: 'long' })} ${convertedDatetime.getDate()} ${convertedDatetime.getFullYear()}`
        const container = this.$el.querySelector('#container')
        this.showLoadButton = container.scrollTop === 0 && (this.channel.currentMessageCount !== this.channel.totalMessageCount)
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
