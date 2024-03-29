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
            @click="listAllMessages()"
            small
            aria-label="Refresh App"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
        <span>Check for new channels</span>
      </v-tooltip>
      <v-tooltip v-if="shouldShowAddChannel" bottom>
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
            v-if="showChannelInput && shouldShowAddChannel"
            v-model="actionChannel.info.name"
            label="Channel Name"
            dense
            outlined
            autofocus
            @keydown.enter="handleCreateChannel(actionChannel)"
            append-icon="mdi-plus-box-outline"
            @click:append="handleCreateChannel(actionChannel)"
          />
          <v-list v-if="channels.length" dense :key='refreshKey' role='list' aria-label="Channel List">
            <v-list-item
              v-for="(channel, i) in channels"
              :key="i"
              @click="openChannel(channel.entry.uuid)"
              :class="['channel', { isCurrent: isCurrentChannel(channel.entry.uuid) }]"
              aria-label="Channel List Items"
            >
              <v-list-item-icon class='channel-icons'>
                <v-icon>mdi-chat-processing-outline</v-icon>
                <span v-if="channel.unseen">+</span>
              </v-list-item-icon>

              <v-list-item-content>
                <v-list-item-title v-if="channel" v-text="channel.info.name" :class="{ isLoading: showIsLoading(channel.entry.uuid) }" />
              </v-list-item-content>

              <span v-if="showIsLoading(channel.entry.uuid)"><Spinner size='13px' class='spinner' :class="{ isLoading: showIsLoading(channel.entry.uuid) }" /></span>

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
import Spinner from './Spinner'
import { shouldShowAddChannel } from '../utils'

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
    Spinner
  },
  methods: {
    ...mapActions('elementalChat', [
      'createChannel',
      'listAllMessages',
      'joinChannel'
    ]),
    handleCreateChannel (input) {
      this.showingAdd = false
      if (input.info.name === '') return
      this.createChannel(input)
    },
    openChannel (id) {
      this.joinChannel(id)
      this.refreshKey += 1
    },
    showIsLoading (id) {
      return !!(this.loadingChannelContent.find(channel => channel.entry.uuid === id))
    },
    isCurrentChannel(id) {
      return this.currentChannelId === id  
    }
  },
  computed: {
    ...mapState('elementalChat', ['channels', 'loadingChannelContent', 'currentChannelId']),
    ...mapGetters('elementalChat', ['channel', 'channelsLoading']),
    showChannelInput () {
      return this.showingAdd || !this.channels.length
    },
    shouldShowAddChannel,
  },
  watch: {
    showingAdd () {
      this.actionChannel = makeEmptyChannel()
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
.isLoading {
  color: #737e77;
}
.channel {
  border-radius: 4px;
  border: 1px solid transparent;
}
.isCurrent {
  border-color: #999;
}
.spinner {
  margin-top: -4px;
  color: #737e77;
  display: grid;
  margin: 0 auto;
  margin-top: 10px;
  justify-content: center;
}
</style>
