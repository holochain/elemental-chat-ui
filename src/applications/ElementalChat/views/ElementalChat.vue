<template>
  <div>
    <v-app-bar app dense dark tile elevation="5">
      <v-toolbar-title class="title pl-0"
        >Elemental Chat {{ channel.info.name ? "- " + channel.info.name : "" }}
      </v-toolbar-title>
      <v-spacer></v-spacer>

      <v-toolbar-title v-if="isHoloSignedIn" @click="holoLogout" class="logout">
        Logout
      </v-toolbar-title>

      <v-toolbar-title class="title pl-0">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              id="update-handle"
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              @click="updateHandle()"
              small
            >
              <v-icon>mdi-account-cog</v-icon>
            </v-btn>
          </template>
          <span>Update user handle</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              id="update-handle"
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              @click="getStats()"
              small
            >
              <v-icon>mdi-chart-line</v-icon>
            </v-btn>
          </template>
          <span>View Stats</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              id="update-handle"
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              small
            >
              <v-icon>mdi-information-outline</v-icon>
            </v-btn>
          </template>
          <div v-if="!appInterface">Loading Version Info...</div>
          <div v-if="appInterface">UI: {{ appInterface.appVersion }}</div>
          <div v-if="appInterface">DNA: {{ appInterface.appId }}</div>
        </v-tooltip>
      </v-toolbar-title>
    </v-app-bar>
    <v-card width="100%" class="fill-height pl-1 pt-1 pr-1">
      <v-row no-gutters height="100%">
        <v-col cols="5" md="3">
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
        <v-col cols="7" md="9">
          <v-card class="ma-0 pt-n1 pl-1" dark>
            <messages :key="channel.channel.uuid" :channel="channel" />
          </v-card>
        </v-col>
      </v-row>
    </v-card>
    <v-dialog v-model="shouldDisplayStats" persistent max-width="660">
      <v-card>
        <v-card-title class="headline">
          Stats
        </v-card-title>
        <v-card-text v-if="statsAreLoading">Loading stats...</v-card-text>
        <v-card-text v-if="!statsAreLoading">
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Total peers:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.agents == undefined ? "--" : stats.agents }} 👤
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Active peers:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.active == undefined ? "--" : stats.active }} 👤
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Channels:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.channels == undefined ? "--" : stats.channels }} 🗨️
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Messages:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.messages == undefined ? "--" : stats.messages }} 🗨️
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="resetStats">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
      refreshKey: 0
    };
  },
  methods: {
    ...mapActions("elementalChat", [
      "listChannels",
      "updateHandle",
      "getStats",
      "resetStats"
    ]),
    ...mapActions(["holoLogout"]),
    openChannel() {
      this.refreshKey += 1;
    },
    channelAdded() {
      this.showAdd = false;
    }
  },
  computed: {
    ...mapState(["conductorDisconnected"]),
    ...mapState(["appInterface"]),
    ...mapState("elementalChat", [
      "channels",
      "channel",
      "stats",
      "showStats",
      "statsLoading"
    ]),
    ...mapState(["isHoloSignedIn"]),
    shouldDisplayStats() {
      return this.showStats;
    },
    statsAreLoading() {
      return this.statsLoading;
    }
  },
  watch: {
    conductorDisconnected(val) {
      if (!val) this.listChannels({ category: "General" });
    }
  }
};
</script>
<style scoped>
.logout {
  font-size: 14px;
  margin-right: 10px;
  margin-top: 5px;
  cursor: pointer;
}
</style>
