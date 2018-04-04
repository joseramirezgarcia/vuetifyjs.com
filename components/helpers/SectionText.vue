<template lang="pug">
  div.text-xs-justify
    translate-btn(:value="value")
    markdown(:source="$t(value)")
</template>

<script>
  export default {
    props: {
      value: {
        type: String,
        default: ''
      }
    }
  }
</script>
