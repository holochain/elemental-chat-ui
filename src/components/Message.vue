<template>
  <v-card v-if="isDisplayMode" dark outlined class="pa-1 mb-1">
    <v-card-text class="pl-0">
      <v-tooltip left>
        <template v-slot:activator="{ on, attrs }">
          <v-icon v-bind="attrs" v-on="on" style="font-size:90%"
            >mdi-calendar-clock
          </v-icon>
        </template>
        <span>{{ createdAt }}</span>
      </v-tooltip>
      {{ content }}
    </v-card-text>
  </v-card>
  <v-textarea
    v-else-if="this.channels.length > 0"
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
    append-icon="mdi-send"
    @click:append="createMessage"
  />
</template>
<script>
import { mapState, mapMutations } from 'vuex'

export default {
  name: 'Message',
  components: {},
  props: {
    message: Object,
    mode: String,
    handleCreateMessage: Function
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
    isDisplayMode () {
      return !!this.message
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
