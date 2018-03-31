<template lang="pug">
  v-btn(icon small v-if="isTranslating" class="translate-btn" @click="translate(value)")
      v-icon(dark :color="color") mode_edit
</template>

<script>
  import {
    mapMutations,
    mapState
  } from 'vuex'

  export default {
    props: {
      value: {
        type: String,
        required: true
      }
    },
    data () {
      return {
        color: 'grey'
      }
    },
    watch: {
      value: {
        handler: 'fetchStatus',
        immediate: true
      }
    },
    computed: {
      ...mapState({
        isTranslating: state => state.app.isTranslating
      })
    },
    methods: {
      ...mapMutations('app', {
        translate: 'TRANSLATE'
      }),
      async fetchStatus () {
        const response = await this.$store.dispatch('app/getTranslationStatus', { locale: this.$i18n.locale, key: this.value })

        this.color = response.data.outdated ? 'warning' : 'grey'
      }
    }
  }
</script>

<style lang="stylus">
  .translate-btn
    position: absolute
    transform: translateX(-40px) translateY(2px)
    margin: 0
</style>
