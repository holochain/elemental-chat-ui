<template>
  <v-card height="100%" outlined dark>
    <v-row class="mx-0  channels-container" justify="center" align="start">
      <v-col cols="12">
        <v-text-field
          id="channel-name"
          v-if="showEmptyMessage"
          v-model="actionChannel.info.name"
          label="Channel Name"
          dense
          outlined
          autofocus
          @keydown.enter="
            handleCreateChannel(actionChannel);
            $emit('channel-added');
          "
          append-icon="mdi-plus-box-outline"
          @click:append="
            handleCreateChannel(actionChannel);
            $emit('channel-added');
          "
        />
        <v-list v-if="channels.length" dense>
          <v-list-item
            v-for="(channel, i) in channels"
            :key="i"
            @click="
              $emit('open-channel');
              joinChannel(channel.entry.uuid);
            "
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
</template>

<script>

import { mapGetters, mapActions } from 'vuex'
import { v4 as uuidv4 } from 'uuid'

export default {
  name: 'Channels',
  props: ['channels', 'showAdd'],
  data () {
    return {
      actionChannel: {
        info: { name: '' },
        channel: { category: 'General', uuid: uuidv4() },
        messages: []
      }
    }
  },
  methods: {
    ...mapActions('elementalChat', [
      'createChannel',
      'listMessages',
      'joinChannel'
    ]),
    handleCreateChannel (input) {
      if (input.info.name === '') return

      this.createChannel(input)
    }
  },
  computed: {
    ...mapGetters('elementalChat', ['channel']),
    showEmptyMessage () {
      return this.showAdd || !this.channels.length
    }
  },
  watch: {
    showAdd () {
      this.actionChannel = {
        info: { name: '' },
        channel: { category: 'General', uuid: uuidv4() },
        messages: []
      }
    }
  }
}
</script>
<style>
.channels-container {
  overflow-y: auto;
  height: calc(100vh - 150px);
}
.channel-icons {
  width: 20px;
}
</style>
