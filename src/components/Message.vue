<template>
  <v-card v-if="isDisplayMode" dark outlined :class="['pa-1', 'mb-1', {'my-message': isMine}]" aria-label='Message Card'>
    <v-card-text class="content">
      <Identicon size="28" :holoHash="message.createdBy" aria-label='Message Author Identity Icon' />
      <span :class="['handle', {'my-handle': isMine}]" aria-label='Message Author Handle'>{{ handle }}</span>
      <span aria-label='Message Content'>{{ body }}</span>
      <v-tooltip left aria-label='Timestamp Tooltip'>
        <template v-slot:activator="{ on, attrs }">
          <v-icon v-bind="attrs" v-on="on" class='calendar-icon'
            >mdi-calendar-clock
          </v-icon>
        </template>
        <span aria-label='Message Timestamp'>{{ createdAt }}</span>
      </v-tooltip>
    </v-card-text>
  </v-card>
  <div v-else-if="this.channels.length > 0" class='input-wrapper' aria-label='Message Input Wrapper'>
    <v-textarea
      class="ml-0 mr-0"
      :class="{ 'send-not-allowed': isHoloAnonymous }"
      v-model="content"
      label="Send a message"
      maxlength="1000"
      dense
      dark
      outlined
      hide-details
      full-width
      rows="3"
      @keydown.enter.prevent="createMessage"
      :append-icon="createMessageLoading ? '' : 'mdi-send'"
      @click:append="createMessage"
      aria-label='Message Textarea'
    />
    <Spinner v-if='createMessageLoading' size='22px' class='spinner' aria-label='Loading Icon'/>
  </div>
</template>
<script>
import { mapState, mapMutations, mapGetters } from 'vuex'
import Spinner from './Spinner'
import Identicon from './Identicon'

export default {
  name: 'Message',
  components: {
    Spinner,
    Identicon
  },
  props: {
    message: Object,
    mode: String,
    handleCreateMessage: Function,
    isMine: Boolean
  },
  data () {
    return {
      uuid: '',
      content: '',
      createdAt: ''
    }
  },
  computed: {
    ...mapState('elementalChat', ['channels']),
    ...mapState('holochain', ['isHoloAnonymous']),
    ...mapGetters('elementalChat', ['createMessageLoading']),
    isDisplayMode () {
      return !!this.message
    },
    handle () {
      const colonIndex = this.content.indexOf(':')
      if (colonIndex !== -1) {
        // Include the colon
        return this.content.slice(0, colonIndex + 1)
      } else {
        return ''
      }
    },
    body () {
      const colonIndex = this.content.indexOf(':')
      if (colonIndex !== -1) {
        return this.content.slice(colonIndex + 1)
      } else {
        return this.content
      }
    },
  },
  methods: {
    ...mapMutations(['setErrorMessage']),
    createMessage () {
      if (this.isHoloAnonymous) {
        return
      }

      if (this.createMessageLoading) {
        // stop user from sending a new message before the last zome call has returned
        return
      }

      if (this.channels.length === 0) {
        this.setErrorMessage('You must first create a channel before sending a message.')
        // refresh error msg setting after 10 secs
        setTimeout(() => {
          this.setErrorMessage('')
        }, 10000)
      } else {
        this.handleCreateMessage(this.content)
      }
      this.content = ''
    }
  },
  created () {
    if (this.message) {
      this.content = this.message.entry.content
      this.createdAt = `${new Date(this.message.createdAt / 1_000)}`
      this.uuid = this.message.entry.uuid
    }
  }
}
</script>
<style scoped>
.input-wrapper {
  max-width: 100%;
  display: flex;
  flex: 1 1 auto;
  position: relative
}
.spinner {
  position: absolute;
  right: 15px;
  top: 10px;
}
.my-message {
  border-color: #999;
}
.handle {
  margin-right: 10px;
  margin-left: 10px;
}
.my-handle {
  font-weight: bold;
}
.content {
  display: flex;
  align-items: center;
  padding: 8px 16px 8px 8px;
}
.calendar-icon {
  font-size: 90%;
  margin-left: auto;
}
</style>
<style>
.send-not-allowed .mdi-send {
  cursor: not-allowed !important;
  opacity: 0.4;
}
</style>
