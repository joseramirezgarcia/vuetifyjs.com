<template lang="pug">
  section.page-head
    translate-btn(:value="header")
    h1.display-1.primary--text#introduction
      markdown(:source="$t(header)")
    translate-btn(:value="text")
    markdown(:source="$t(text)")
    slot(name="sup")
</template>

<script>
  export default {
    name: 'PageHead',

    props: {
      header: {
        type: null,
        default: null
      },
      text: {
        type: null,
        default: null
      }
    }
  }
</script>
