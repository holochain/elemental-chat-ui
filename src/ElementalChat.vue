<template>
  <div>
    <v-app-bar app dense dark tile elevation="5">
      <v-toolbar-title class="title pl-0 no-wrap">
        <img src="@/assets/chat.png" class="title-logo" />
        Elemental Chat {{ channel.info.name ? "- " + channel.info.name : "" }}
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
              @click="editHandle()"
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
              @click="handleShowStats"
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
          <div v-if="!dnaHash">Loading Version Info...</div>
          <div v-if="dnaHash">UI: {{ appVersion }}</div>
          <div v-if="dnaHash">DNA: {{ dnaHash }}</div>
        </v-tooltip>
      </v-toolbar-title>
    </v-app-bar>
    <v-card dark outlined class="mb-1 v-application banner">
      <v-card-text class="pl-0 text-center lime black-text">
        <p class="banner-text">
          This is a proof of concept application, not intended for full
          production use. Read more in our
          <a @click="visitPocPage" class="underline link-text"
            >Elemental Chat FAQs</a
          >
        </p>
      </v-card-text>
    </v-card>
    <v-card width="100%" class="fill-height pl-1 pt-1 pr-1">
      <v-row no-gutters height="100%">
        <Channels />
        <v-col cols="7" md="9">
          <v-card class="ma-0 pt-n1 pl-1" dark>
            <Messages :key="channel.entry.uuid" :channel="channel" />
          </v-card>
        </v-col>
      </v-row>
    </v-card>
    <v-dialog v-model="showingStats" persistent max-width="660">
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
              {{ stats.agentCount === undefined ? "--" : stats.agentCount }} 👤
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Active peers:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.activeCount === undefined ? "--" : stats.activeCount }} 👤
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Channels:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.channelCount === undefined ? "--" : stats.channelCount }} 🗨️
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Messages:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.messageCount === undefined ? "--" : stats.messageCount }} 🗨️
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showingStats = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapState, mapActions, mapGetters, mapMutations } from 'vuex'
export default {
  name: 'ElementalChat',
  components: {
    Channels: () => import('./components/Channels.vue'),
    Messages: () => import('./components/Messages.vue')
  },
  data () {
    return {
      showingStats: false
    }
  },
  methods: {
    ...mapMutations(['editHandle']),
    ...mapActions('elementalChat', [
      'listChannels',
      'getStats'
    ]),
    ...mapActions('holochain', ['holoLogout']),
    visitPocPage () {
      window.open('https://holo.host/faq-tag/elemental-chat/', '_blank')
    },
    handleShowStats () {
      this.getStats()
      this.showingStats = true
    }
  },
  computed: {
    ...mapState('holochain', [
      'conductorDisconnected',
      'appInterface',
      'isHoloSignedIn',
      'dnaHash']),
    ...mapState('elementalChat', [
      'stats',
      'statsLoading'
    ]),
    ...mapGetters('elementalChat', [
      'channel'
    ]),
    statsAreLoading () {
      return this.statsLoading
    },
    appVersion () {
      return process.env.VUE_APP_UI_VERSION
    }
  },
  watch: {
    conductorDisconnected (val) {
      if (!val) this.listChannels({ category: 'General' })
    }
  }
}
</script>
<style scoped>
.logout {
  font-size: 14px;
  margin-right: 10px;
  margin-top: 5px;
  cursor: pointer;
}
.no-wrap {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime {
  background-color: #d7ea44;
}
.underline {
  text-decoration: underline;
}
.title {
  display: flex;
  align-items: center;
}

.title-logo {
  width: 30px;
  margin-right: 5px;
}
.link-text {
  color: #5c007a !important;
}
.black-text {
  color: black !important;
}
.banner-text {
  font-size: 15px;
  margin-bottom: -10px;
}
.banner {
  border-radius: 0px;
  box-shadow: 0px 10px 10px 2px rgba(128, 128, 0, 0.2),
    0px 10px 10px 2px rgba(128, 128, 0, 0.2),
    0px 10px 10px 2px rgba(128, 128, 0, 0.2) !important;
}
</style>
