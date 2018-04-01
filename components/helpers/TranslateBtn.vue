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
        try {
          const response = await this.$store.dispatch('app/getTranslationStatus', { locale: this.$i18n.locale, key: this.value })

          if (response.status === 200 && response.data.status) {
            switch (response.data.status) {
              case 'updated':
                this.color = 'warning'
                break
              case 'added':
                this.color = 'error'
                break
              default:
                this.color = 'grey'
            }
          }
        } catch (err) {
          console.log(err)
        }
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
