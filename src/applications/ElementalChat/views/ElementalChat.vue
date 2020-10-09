<template>
  <div>
    <v-card width="100%" class="fill-height pl-1 pt-1 pr-1">
      <v-row no-gutters height="100%">
        <v-col cols="3">
          <v-toolbar dense dark tile class="mb-1">
            <v-toolbar-title>Channels</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  id="add-channel"
                  color="action"
                  icon
                  v-bind="attrs"
                  v-on="on"
                  @click="listChannels({ category: 'General' })"
                  small
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
                  @click="showAdd = true"
                  small
                >
                  <v-icon>mdi-chat-plus-outline</v-icon>
                </v-btn>
              </template>
              <span>Add a public Channel.</span>
            </v-tooltip>
          </v-toolbar>
          <channels
            :channels="channels"
            :showAdd="showAdd"
            @open-channel="openChannel"
            @channel-added="channelAdded"
          />
        </v-col>
        <v-col cols="9">
          <v-card class="ma-0 pt-n1 pl-1" dark>
            <v-app-bar app dense dark tile elevation="5">
              <v-toolbar-title class="title pl-0"
                >Elemental Chat - {{ channel.name }}</v-toolbar-title
              >
              <v-spacer></v-spacer>
            </v-app-bar>
            <messages :key="refreshKey" :channel="channel" />
          </v-card>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<script>
import { mapState, mapActions } from "vuex";
export default {
  name: "ElementalChat",
  components: {
    Channels: () => import("../components/Channels.vue"),
    Messages: () => import("../components/Messages.vue")
  },
  data() {
    return {
      showAdd: false,
      refreshKey: 0,
      channel: {
        name: "",
        channel: { category: "General", uuid: "" },
        messages: []
      }
    };
  },
  methods: {
    ...mapActions("elementalChat", ["listChannels"]),
    openChannel(channel) {
      this.refreshKey += 1;
      this.channel = { ...channel };
    },
    channelAdded() {
      this.showAdd = false;
    },

    connect() {
      var sleep = time => new Promise(resolve => setTimeout(resolve, time));
      var poll = (promiseFn, time) =>
        promiseFn().then(sleep(time).then(() => poll(promiseFn, time)));
      poll(
        () =>
          new Promise(() => {
            this.listChannels({ category: "General" });
          }),
        10000
      );
    }
  },
  computed: {
    ...mapState("elementalChat", ["channels"])
  }
};
</script>
