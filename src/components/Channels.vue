<template>
  <v-col cols="5" md="3">
    <v-toolbar dense dark tile class="mb-1" aria-label="Channel Bar">
      <v-toolbar-title class="channel-title">Channels</v-toolbar-title>
      <Spinner v-if='channelsLoading' size='18px' />
      <v-spacer></v-spacer>
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            id="refresh"
            color="action"
            icon
            v-bind="attrs"
            v-on="on"
            @click="listChannels({ category: 'General' })"
            small
            aria-label="Refresh App"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
        <span>Check for new channels</span>
      </v-tooltip>
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            id="add-channel"
            color="action"
            icon
            v-bind="attrs"
            v-on="on"
            @click="showingAdd = true"
            small
            aria-label="Add New Channel"
          >
            <v-icon>mdi-chat-plus-outline</v-icon>
          </v-btn>
        </template>
        <span>Add a public Channel.</span>
      </v-tooltip>
    </v-toolbar>
    <v-card height="100%" outlined dark>
      <v-row class="mx-0  channels-container" justify="center" align="start">
        <v-col cols="12">
          <v-text-field
            id="channel-name"
            v-if="showMessageInput"
            v-model="actionChannel.info.name"
            label="Channel Name"
            dense
            outlined
            autofocus
            @keydown.enter="handleCreateChannel(actionChannel)"
            append-icon="mdi-plus-box-outline"
            @click:append="handleCreateChannel(actionChannel)"
          />
          <v-list v-if="channels.length" dense :key='refreshKey' aria-label="Channel List">
            <v-list-item
              v-for="(channel, i) in channels"
              :key="i"
              @click="openChannel(channel.entry.uuid)"
              aria-label="Channel List Items"
            >
              <v-list-item-icon class='channel-icons'>
                <v-icon>mdi-chat-processing-outline</v-icon>
                <span v-if="channel.unseen">+</span>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title v-if="channel" v-text="channel.info.name" />
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-col>
      </v-row>
    </v-card>
  </v-col>
</template>

<script>

import { mapState, mapGetters, mapActions } from 'vuex'
import { v4 as uuidv4 } from 'uuid'

const makeEmptyChannel = () => ({
  info: { name: '' },
  entry: { category: 'General', uuid: uuidv4() },
  messages: []
})

export default {
  name: 'Channels',
  data () {
    return {
      actionChannel: makeEmptyChannel(),
      showingAdd: false,
      refreshKey: 0
    }
  },
  components: {
    Spinner: () => require('./Spinner.vue'),
  },
  methods: {
    ...mapActions('elementalChat', [
      'createChannel',
      'listChannels',
      'joinChannel'
    ]),
    handleCreateChannel (input) {
      this.showingAdd = false
      if (input.info.name === '') return

      console.log('CREATING CHANNEL with following input ; ', input)
      this.createChannel(input)
    },
    openChannel (id) {
      this.joinChannel(id)
      this.refreshKey += 1
    }
  },
  computed: {
    ...mapState('elementalChat', ['channels']),
    ...mapGetters('elementalChat', ['channel', 'channelsLoading']),
    showMessageInput () {
      // console.log('this.showingAdd : ', this.showingAdd)
      // console.log(' no channels? , this.channels.length : ', !this.channels.length, this.channels.length)
      console.log('showMessageInput ? : ', this.showingAdd || !this.channels.length)
      return this.showingAdd || !this.channels.length
    }
  },
  created () {
    console.log('>>>>>>>>> starting channel list: ', this.channels)
    console.log('COMPUTED CHANNEL ; ', this.channel)
  },
  watch: {
    showingAdd () {
      console.log('making empty channel...')
      this.actionChannel = makeEmptyChannel()
    },
    channels (val) {
      console.log('CHANNELS LIST CHANGED >>>> channel items with values: ', val)
      console.log('chanel list length : ', val.length)
      const newChannel = val[0]
      if (newChannel) {
        console.log('channel info name: ', newChannel.info.name)
      }
    }
  }
}
</script>
<style scoped>
.channels-container {
  overflow-y: auto;
  height: calc(100vh - 150px);
}
.channel-title {
  margin-right: 20px;
}
.channel-icons {
  width: 20px;
}
</style>
