<template lang="pug">
  v-content
    v-fade-transition(mode="out-in")
      router-view(:key="$route.path")
    //- app-footer
    translation-bar
    create-translation-dialog
</template>

<script>
  // Components
  import AppFooter from '@/components/core/AppFooter'

  export default {
    components: {
      AppFooter
    }
  }
</script>
