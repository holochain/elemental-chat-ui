<template>
  <v-card v-if="internalMode === 'display'" dark outlined class="pa-1 mb-1">
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
    v-else
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
import { mapState, mapActions } from 'vuex'
import { v4 as uuidv4 } from 'uuid'
export default {
  name: 'Message',
  components: {},
  props: ['message', 'mode'],
  data () {
    return {
      internalMode: '',
      uuid: '',
      content: '',
      createdAt: 'xx'
    }
  },
  computed: {
    ...mapState('elementalChat', ['channels'])
  },
  methods: {
    ...mapActions('elementalChat', ['diplayErrorMessage']),
    createMessage () {
      const message = {
        uuid: uuidv4(),
        content: this.content
      }
      if (!this.channels.length) {
        this.diplayErrorMessage({
          message: 'You must first create a channel before sending a message.',
          shouldShow: true
        })
        // refresh error msg setting after 5sec
        setTimeout(() => {
          this.diplayErrorMessage({ message: '', shouldShow: false })
        }, 5000)
      } else {
        this.$emit('message-created', message)
      }
      this.content = ''
    }
  },
  created () {
    if (this.message) {
      this.internalMode = this.mode
      this.content = this.message.message.content
      this.createdAt = `${new Date(this.message.createdAt[0] * 1000)}`
      this.uuid = this.message.message.uuid
    }
  }
}
</script>
