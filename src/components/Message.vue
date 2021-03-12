<template>
  <v-card v-if="isDisplayMode" dark outlined :class="['pa-1', 'mb-1', {'my-message': isMine}]">
    <v-card-text class="content">
      <Identicon size="28" :holoHash="message.createdBy" />
      <span :class="['handle', {'my-handle': isMine}]">{{ handle }}</span>
      {{ body }}
      <v-tooltip left>
        <template v-slot:activator="{ on, attrs }">
          <v-icon v-bind="attrs" v-on="on" class='calendar-icon'
            >mdi-calendar-clock
          </v-icon>
        </template>
        <span>{{ createdAt }}</span>
      </v-tooltip>
    </v-card-text>
  </v-card>
  <div v-else-if="this.channels.length > 0" class='input-wraper'>
    <v-textarea
      class="ml-0 mr-0"
      v-model="content"
      label="Send a message"
      maxlength="1000"
      dense
      dark
      outlined
      hide-details
      full-width
      rows="3"
      @keydown.enter="createMessage"
      :append-icon="createMessageLoading ? '' : 'mdi-send'"
      @click:append="createMessage"
    />
    <Spinner v-if='createMessageLoading' size='22px' class='spinner' />
  </div>
</template>
<script>
import { mapState, mapMutations, mapGetters } from 'vuex'
import Spinner from './Spinner.vue'
import Identicon from './Identicon.vue'

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
    ...mapGetters('elementalChat', ['createMessageLoading']),
    isDisplayMode () {
      return !!this.message
    },
    handle () {
      const split = this.content.split(':')
      console.log('handle', split)
      if (split.length > 1) {
        return split[0] + ':'
      } else {
        return ''
      }
    },
    body () {
      const split = this.content.split(':')
      if (split.length > 1) {
        return split.slice(1).join(':')
      } else {
        return this.content
      }
    }
  },
  methods: {
    ...mapMutations(['setErrorMessage']),
    createMessage () {
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
      this.createdAt = `${new Date(this.message.createdAt[0] * 1000)}`
      this.uuid = this.message.entry.uuid
    }
  }
}
</script>
<style scoped>
.input-wraper {
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
