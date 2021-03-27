<template>
  <Circle2 :size='size' background="#FFF" color="#1E1E1E" stroke="3px" />
</template>

<script>
// const { Circle2 } = require('vue-loading-spinner')

export default {
  name: 'Spinner',
  components: {
    Circle2: () => require('vue-loading-spinner')
  },
  props: {
    size: String
  }
}
</script>
