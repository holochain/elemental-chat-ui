<template>
  <v-card height="100%" outlined dark>
    <v-row class="mx-0 fill-height" justify="center" align="start">
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
            createChannel(actionChannel);
            $emit('channel-added');
          "
          append-icon="mdi-plus-box-outline"
          @click:append="
            createChannel(actionChannel);
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
      "listMessages"
    ]),
    showEmptyMessage() {
      console.log("showAdd : ", this.showAdd);
      console.log("this.channels.length : ", this.channels.length);
      return this.showAdd && !this.channels.length;
    }
  },
  computed: {
    ...mapState(["today"])
  },
  watch: {
    showAdd() {
      this.actionChannel = {
        info: { name: "" },
        channel: { category: "General", uuid: uuidv4() },
        messages: []
      };
    }
  }
};
</script>
