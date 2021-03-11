<template>
  <canvas ref='canvas' :style="style" width="1" height="1" />
</template>

<script>
import renderIcon from '@/identicon'

export default {
  name: 'Identicon',
  props: {
    holoHash: Uint8Array,
    size: String
  },
  data () {
    return {
      style: {
        borderRadius: '50%'
      }
    }
  },
  methods: {
    renderIcon () {
      console.log('calling render icon with', this.opts)
      renderIcon(this.opts, this.$refs.canvas)
    }
  },
  computed: {
    opts () {
      return {
        seed: this.holoHash,
        size: this.size,
        gridSize: 8
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
    }
  }
}
</script>
