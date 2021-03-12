<template>
  <canvas ref='canvas' width="1" height="1" :style="style" />
</template>

<script>
import renderIcon from '@/identicon'

export default {
  name: 'Identicon',
  props: {
    holoHash: Uint8Array,
    size: String,
    backgroundColor: String,
    styleProp: Object
  },
  methods: {
    renderIcon () {
      renderIcon(this.opts, this.$refs.canvas)
    }
  },
  computed: {
    opts () {
      return {
        hash: this.holoHash,
        size: this.size,
        backgroundColor: this.backgroundColor,
        gridSize: 8
      }
    },
    style () {
      return {
        'border-radius': '50%',
        ...this.styleProp
      }
    }
  },
  mounted () {
    this.renderIcon()
  },
  watch: {
    holoHash () {
      this.renderIcon()
    },
    size () {
      this.renderIcon()
    },
    backgroundColor () {
      this.renderIcon()
    }
    // is there a better way?
  }
}
</script>
