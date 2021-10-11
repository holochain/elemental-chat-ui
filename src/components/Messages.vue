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
import { arrayBufferToBase64, formPaginationDateTime, shouldAllowPagination } from '@/store/utils'
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
      earliestDate: '',
      lastSeenMsgId: null,
    }
  },
  computed: {
    ...mapState('holochain', ['conductorDisconnected', 'agentKey']),
    ...mapGetters('elementalChat', ['channel', 'listMessagesLoading', 'createMessageLoading']),
    messages () {
      return this.channel.messages
    },
    shouldLoadMore () {
      return this.showLoadButton
    },
    totalMessageCount () {
      return this.channel.totalMessageCount
    },
    currentMessageCount () {
      return this.channel.currentMessageCount
    }
  },
  methods: {
    ...mapActions('elementalChat', ['createMessage', 'getMessageChunk']),
    handleCreateMessage (content) {
      this.scrollToEnd()
      this.createMessage({
        channel: this.channel,
        content
      })
    },
    onScroll () {
      const container = this.$el.querySelector('#container')
      // NOTE: Set last seen message to top of scroll upon pagination trigger
      // -- (we handle this here bc the full list of new messages has been rendered to dom)
      if (this.lastSeenMsgId) {
        container.scrollTop = 0
        const offset = document.getElementById(this.lastSeenMsgId).getBoundingClientRect().top - document.getElementById(this.lastSeenMsgId).offsetParent.getBoundingClientRect().top
        container.scrollTop = offset
        // set datetime string for polling reference
        this.earliestDate = formPaginationDateTime(this.messages[0])
        this.lastSeenMsgId = null
      }
      this.userIsScrolling = true
      this.showLoadButton = shouldAllowPagination(this.channel)
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
    loadMoreMessages () {
      this.showLoadButton = false
      this.lastSeenMsgId = this.messages[0].entry.uuid
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
    totalMessageCount (total) {
      if (this.channel.currentMessageCount === total) {
        this.showLoadButton = false
      } else if (total > 0) {
        // set datetime string for polling reference
        this.earliestDate = formPaginationDateTime(this.messages[0])
        this.showLoadButton = shouldAllowPagination(this.channel)
      }
    },
    currentMessageCount (currentCount) {
      if (currentCount && this.lastSeenMsgId) {
        const container = this.$el.querySelector('#container')
        // trigger onscroll
        container.scrollTop = container.scrollHeight
      }
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
    if (this.channel.totalMessageCount > 0) {
      this.showLoadButton = shouldAllowPagination(this.channel)
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
