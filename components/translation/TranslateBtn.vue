<template lang="pug">
  v-btn(icon dark small v-if="isTranslating" class="translate-btn" @click="translate(value)")
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
      }
    },
    computed: {
      ...mapState({
        buttons: state => state.translation.buttons,
        isTranslating: state => state.translation.isTranslating
      }),
      status () {
        const state = this.buttons.find(b => b.key === this.value)
        return state ? state.status : 'unchanged'
      },
      color () {
        switch (this.status) {
          case 'updated': return 'warning'
          case 'missing': return 'error'
          default: return 'grey'
        }
      }
    },
    watch: {
      value: {
        handler: 'fetchStatus',
        immediate: true
      }
    },
    created () {
      this.$store.commit('translation/REGISTER_BTN', { key: this.value, status: 'unchanged' })
    },
    beforeDestroy () {
      this.$store.commit('translation/UNREGISTER_BTN', { key: this.value })
    },
    methods: {
      ...mapMutations('translation', {
        translate: 'TRANSLATE'
      }),
      update (status) {
        if (!status) return this.status

        this.status = status
      },
      async fetchStatus () {
        if (this.value.length <= 0) return

        try {
          const response = await this.$store.dispatch('translation/status', { locale: this.$i18n.locale, key: this.value })

          if (response.status === 200 && response.data.status) {
            let status = response.data.status

            this.$store.commit('translation/UPDATE_BTN', { key: this.value, status })
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
    transform: translateX(-40px)
    margin: 0
</style>
