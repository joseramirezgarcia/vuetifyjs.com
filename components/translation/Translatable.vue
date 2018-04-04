<template lang="pug">
  v-badge(v-model="isTranslating" left :color="color")
    v-icon(dark slot="badge" @click="translate(i18n)") mode_edit
    slot
</template>

<script>
  import {
    mapMutations,
    mapState
  } from 'vuex'

  export default {
    name: 'translatable',

    inheritAttrs: false,

    props: {
      i18n: {
        type: String,
        required: true
      }
    },

    computed: {
      ...mapState({
        buttons: state => state.translation.buttons,
        isTranslating: state => state.translation.isTranslating
      }),
      status () {
        const state = this.buttons.find(b => b.key === this.i18n)
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
      this.$store.commit('translation/REGISTER_BTN', { key: this.i18n, status: 'unchanged' })
    },
    beforeDestroy () {
      this.$store.commit('translation/UNREGISTER_BTN', { key: this.i18n })
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
        if (!this.isTranslating || this.i18n.length <= 0) return

        try {
          const response = await this.$store.dispatch('translation/status', { locale: this.$i18n.locale, key: this.i18n })

          if (response.status === 200 && response.data.status) {
            let status = response.data.status

            this.$store.commit('translation/UPDATE_BTN', { key: this.i18n, status })
          }
        } catch (err) {
          console.log(err)
        }
      }
    }
  }
</script>
