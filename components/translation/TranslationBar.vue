<template lang="pug">
  v-bottom-sheet(hide-overlay persistent v-model="showBar")
    v-card
      v-container(fluid)
        v-layout(wrap row)
          v-flex(xs6 pr-2)
            v-text-field(
              label="Original"
              disabled
              textarea
              hide-details
              :value="$t(currentKey, 'en')")
          v-flex(xs6 pl-2)
            v-text-field(
              label="Translation"
              textarea
              hide-details
              v-model="value")
          v-flex(xs6)
            v-chip
              v-avatar(color="warning" class="white--text")
                span {{ outdatedKeys }}
              span Outdated
            v-chip
              v-avatar(color="error" class="white--text")
                span {{ missingKeys }}
              span Missing
          v-flex(xs6 text-xs-right)
            v-btn(@click="show(false)" outline color="grey") close
            v-btn(@click="save" color="primary") save
</template>

<script>
  import deepmerge from 'deepmerge'

  import {
    mapMutations,
    mapState
  } from 'vuex'

  export default {
    data () {
      return {
        value: ''
      }
    },
    computed: {
      ...mapState({
        buttons: state => state.translation.buttons,
        showBar: state => state.translation.showBar,
        currentKey: state => state.translation.currentKey
      }),
      outdatedKeys () {
        return this.buttons.filter(b => b.status === 'updated').length
      },
      missingKeys () {
        return this.buttons.filter(b => b.status === 'missing').length
      }
    },
    watch: {
      currentKey (v) {
        console.log(this.$i18n)
        this.value = this.$te(v) ? this.$t(v) : ''
      }
    },
    methods: {
      ...mapMutations('translation', {
        show: 'SHOW_BAR'
      }),
      convert (msg) {
        const { key, value } = msg
        const parts = key.split('.')
        const data = {}

        let obj = data
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i]

          // We have array, let's get original
          // value in locale message and merge
          const matches = part.match(/\[(\d+)\]/)
          if (matches) {
            const partWithoutIndex = part.replace(/\[\d+\]/, '')
            const index = matches[1]
            const path = [...parts.slice(0, parts.findIndex(p => p === part)), partWithoutIndex].join('.')
            const arr = this.$t(path)
            console.log(partWithoutIndex, index, path, arr)

            obj[partWithoutIndex] = arr
            obj = obj[partWithoutIndex][index]
          } else if (i < parts.length - 1) {
            obj[part] = {}
            obj = obj[part]
          } else obj[part] = value
        }

        return data
      },
      merge (locale, data) {
        const emptyTarget = value => Array.isArray(value) ? [] : {}
        const clone = (value, options) => deepmerge(emptyTarget(value), value, options)

        const arrayMerge = (target, source, options) => {
          const destination = target.slice()

          source.forEach(function (e, i) {
            if (typeof destination[i] === 'undefined') {
              const cloneRequested = options.clone !== false
              const shouldClone = cloneRequested && options.isMergeableObject(e)
              destination[i] = shouldClone ? clone(e, options) : e
            } else if (options.isMergeableObject(e)) {
              destination[i] = deepmerge(target[i], e, options)
            } else if (target.indexOf(e) === -1) {
              destination.push(e)
            }
          })
          return destination
        }

        return deepmerge(this.$i18n.getLocaleMessage(locale), data, { arrayMerge })
      },
      async save () {
        const msg = {
          locale: this.$i18n.locale,
          key: this.currentKey,
          value: this.value
        }

        const response = await this.$store.dispatch('translation/save', msg)

        if (response.status === 200) {
          const data = this.convert(msg)
          const merged = this.merge(msg.locale, data)
          console.log(merged)
          this.$i18n.setLocaleMessage(msg.locale, merged)
          const btn = this.buttons.find(b => b.key === this.currentKey)
          if (btn) this.$store.commit('translation/UPDATE_BTN', { uid: btn.uid, status: 'unchanged' })
        }
      }
    }
  }
</script>
