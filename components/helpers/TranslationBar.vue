<template>
  <v-bottom-sheet hide-overlay persistent v-model="showTranslationBar">
    <v-card>
      <v-container fluid grid-list-md>
        <v-layout>
          <v-flex>
            <v-text-field
              label="Original"
              disabled
              textarea
              :value="$t(translationKey, 'en')"
            ></v-text-field>
          </v-flex>
          <v-flex>
            <v-text-field
              label="Translation"
              textarea
              v-model="value"
            ></v-text-field>
          </v-flex>
        </v-layout>
      </v-container>
      <v-btn @click="show(false)">close</v-btn>
      <v-btn @click="save">save</v-btn>
    </v-card>
  </v-bottom-sheet>
</template>

<script>
  import deepmerge from 'deepmerge'

  import {
    mapMutations,
    mapState,
    mapActions
  } from 'vuex'

  export default {
    data () {
      return {
        value: ''
      }
    },
    watch: {
      translationKey (v) {
        console.log(v, this.$t(v))
        this.value = this.$t(v)
      }
    },
    computed: {
      ...mapState({
        showTranslationBar: state => state.app.showTranslationBar,
        translationKey: state => state.app.translationKey
      })
    },
    methods: {
      ...mapMutations('app', {
        show: 'SHOW_TRANSLATION_BAR'
      }),
      convert (msg) {
        const { locale, key, value } = msg
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

          source.forEach(function(e, i) {
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
          key: this.translationKey,
          value: this.value
        }

        // const ok = await this.$store.dispatch('app/saveTranslation', msg)
        const ok = true
        console.log(msg)
        const data = this.convert(msg)
        console.log(data)
        const merged = this.merge(msg.locale, data)
        console.log(merged)

        if (ok) this.$i18n.setLocaleMessage(msg.locale, merged)
        // console.log(this.$i18n.getLocaleMessage(msg.locale))
      }
    }
  }
</script>
