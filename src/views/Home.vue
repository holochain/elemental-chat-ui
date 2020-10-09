<template>
  <div>
    <v-card height="100%" width="100%">
      <v-app-bar app dense dark clipped-left tile elevation="5">
        <v-toolbar-title class="title">
          Crispr Responsive Web Container
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-tooltip bottom v-if="this.$vuetify.breakpoint.smAndDown">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              to="/public-messages-dialog"
              small
            >
              <v-icon>mdi-chat-processing-outline</v-icon>
            </v-btn>
          </template>
          <span>Go to the Public Messages App!</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              @click="setupAgent"
              small
            >
              <v-icon>mdi-cloud-sync-outline</v-icon>
            </v-btn>
          </template>
          <span>Connect to admin</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              @click="createAppInterface"
              small
            >
              <v-icon>mdi-face-agent</v-icon>
            </v-btn>
          </template>
          <span>createAppInterface</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              @click="callZome"
              small
            >
              <v-icon>mdi-function</v-icon>
            </v-btn>
          </template>
          <span>Call zome</span>
        </v-tooltip>
        <v-tooltip bottom v-if="this.$vuetify.breakpoint.mdAndUp">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              to="/public-messages"
              small
            >
              <v-icon>mdi-chat-processing-outline</v-icon>
            </v-btn>
          </template>
          <span>Go to the Public Messages App!</span>
        </v-tooltip>
      </v-app-bar>
      <v-row :no-gutters="this.$vuetify.breakpoint.smAndDown">
        <v-col>
          <v-card
            max-width="380"
            class="mx-auto"
            :outlined="this.$vuetify.breakpoint.mdAndUp"
          >
            <v-list-item>
              <v-list-item-avatar size="50">
                <v-img :src="require('@/assets/holochain-halo.png')"></v-img>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="title">Crispr</v-list-item-title>
                <v-list-item-subtitle class="subtitle-2"
                  >Build beautiful Holo applications</v-list-item-subtitle
                >
              </v-list-item-content>
            </v-list-item>
            <v-img
              :src="require('@/assets/crispr-logo.png')"
              width="270"
              class="mx-auto"
            ></v-img>
            <v-card-text>
              <p class="subtitle-1">Responsive Web Container Tasks App</p>
              <p>
                Small devices navigate to the Tasks list via the Tasks icon top
                right. Larger devices use a floating action button to open a
                right side navigation drawer. Clicking a Task in the navigation
                drawer will add the tasks's check list items to the bottom of
                the screen. On small devices a full screen dialog will show.
              </p>
            </v-card-text>
            <v-card-actions>
              <v-btn
                text
                href="https://holo.host"
                target="_blank"
                color="deep-purple accent-4"
              >
                Holo Hosting
              </v-btn>
              <v-btn
                text
                href="https://holochain.org"
                target="_blank"
                color="deep-purple accent-4"
              >
                Holochain
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>
<script>
import { mapActions } from "vuex";
export default {
  name: "Home",
  components: {},
  methods: {
    ...mapActions([
      "connectAdmin",
      "setupAgent",
      "createAppInterface",
      "callZome"
    ])
  }
};
</script>
