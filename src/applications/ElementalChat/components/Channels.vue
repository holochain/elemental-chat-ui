<template>
  <v-card height="100%" outlined dark>
    <v-row class="mx-0 fill-height" justify="center" align="start">
      <v-col cols="12">
        <v-text-field
          id="channel-name"
          v-if="showAdd"
          v-model="actionChannel.name"
          label="Channel Name"
          dense
          outlined
          @keydown.enter="
            createChannel(actionChannel);
            $emit('channel-added');
            $emit('open-channel', actionChannel);
          "
          append-icon="mdi-plus-box-outline"
          @click:append="
            createChannel(actionChannel);
            $emit('channel-added');
            $emit('open-channel', actionChannel);
          "
        />
        <v-list dense>
          <v-list-item>
            <v-list-item-icon>
              <v-icon size="40">mdi-chat-processing-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>Channels</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-divider></v-divider>
          <v-list-item
            v-for="(channel, i) in channels"
            :key="i"
            @click="$emit('open-channel', channel)"
          >
            <v-list-item-icon>
              <v-icon>mdi-chat-processing-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title v-text="channel.name" />
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-col>
    </v-row>
  </v-card>
</template>
<script>
import { mapActions } from "vuex";
import { v4 as uuidv4 } from "uuid";
export default {
  name: "Channels",
  props: ["channels", "showAdd"],
  data() {
    return {
      actionChannel: {
        name: "",
        channel: { category: "General", uuid: uuidv4() },
        messages: []
      }
    };
  },
  methods: {
    ...mapActions("elementalChat", ["createChannel"])
  },
  watch: {
    showAdd() {
      this.name = "";
      this.actionChannel = {
        name: "",
        channel: { category: "General", uuid: uuidv4() },
        messages: []
      };
    }
  }
};
</script>
