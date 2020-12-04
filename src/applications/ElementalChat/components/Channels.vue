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
            checkCreateChannel(actionChannel);
            $emit('channel-added');
          "
          append-icon="mdi-plus-box-outline"
          @click:append="
            checkCreateChannel(actionChannel);
            $emit('channel-added');
          "
        />
        <v-list v-if="channels.length" dense>
          <v-list-item
            v-for="(channel, i) in channels"
            :key="i"
            @click="
              $emit('open-channel');
              setChannel(channel);
            "
          >
            <v-list-item-icon>
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
import { mapState, mapActions } from "vuex";
import { v4 as uuidv4 } from "uuid";
export default {
  name: "Channels",
  props: ["channels", "showAdd"],
  data() {
    return {
      actionChannel: {
        info: { name: "" },
        channel: { category: "General", uuid: uuidv4() },
        messages: []
      }
    };
  },
  methods: {
    ...mapActions("elementalChat", [
      "setChannel",
      "createChannel",
      "listMessages",
      "rehydrateChannels"
    ]),
    checkCreateChannel(input) {
      if (input.info.name === "") return;
      else this.createChannel(input);
    },
    unseenMessages() {
      return this.channel.unseen;
    }
  },
  computed: {
    ...mapState("elementalChat", ["channel"]),
    showEmptyMessage() {
      return this.showAdd || !this.channels.length;
    }
  },
  watch: {
    showAdd() {
      this.actionChannel = {
        info: { name: "" },
        channel: { category: "General", uuid: uuidv4() },
        messages: []
      };
    },
    channel(val) {
      console.log("channel value : ", val);
    }
  },
  created() {
    this.rehydrateChannels();
  }
};
</script>
<style>
.channels-container {
  overflow-y: auto;
  height: calc(100vh - 75px);
}
</style>
