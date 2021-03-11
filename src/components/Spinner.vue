<template>
  <Circle2 :size='size' background="#FFF" color="#1E1E1E" stroke="3px" />
</template>

<script>
import { Circle2 } from 'vue-loading-spinner'

export default {
  name: 'Spinner',
  components: {
    Circle2
  },
  props: {
    size: String
  }
}
</script>
