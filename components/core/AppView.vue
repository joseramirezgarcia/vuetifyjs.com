<template lang="pug">
  v-content
    v-fade-transition(mode="out-in")
      router-view(:key="$route.path")
    //- app-footer
    translation-bar(v-if="isTranslating")
    create-translation-dialog(v-if="isTranslating")
</template>

<script>
  import { mapState } from 'vuex'
  // Components
  import AppFooter from '@/components/core/AppFooter'

  export default {
    components: {
      AppFooter
    },
    computed: {
      ...mapState('translation', {
        isTranslating: state => state.isTranslating
      })
    }
  }
</script>
